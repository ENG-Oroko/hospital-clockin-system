import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  NotificationChannel, NotificationPriority, NotificationStatus,
  NotificationTriggerEvent, NotificationPayload, DispatchResult,
  PRIORITY_CHANNEL_RULES,EVENT_PRIORITY_MAP,
} from '../types/notification.types';
import { NotificationRepository } from '../repositories/notification.repository';
import { PreferenceService } from './preference.service';
import { RendererService } from './renderer.service';
import { InAppChannel } from '../channels/in-app.channel';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';
import { ChannelPayload } from '../channels/in-app.channel';

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly preferenceService: PreferenceService,
    private readonly rendererService: RendererService,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  async dispatch(payload: NotificationPayload): Promise<void> {
    this.logger.debug(`Dispatching ${payload.event} to ${payload.userId}`);
    try {
      const enabledChannels = await this.preferenceService.getEnabledChannels(payload.tenantId, payload.userId, payload.event);
      const channelsToUse = this.filterChannelsByPriority(enabledChannels, payload.priority);

      if (channelsToUse.length === 0) {
        this.logger.warn(`No enabled channels for ${payload.event}`);
        return;
      }

      // FIXED: render() takes 3 args: event, channel, data
      // We render per-channel since templates differ per channel.
      // For queuing we store one rendered version (IN_APP as default).
      const defaultChannel = channelsToUse.includes(NotificationChannel.IN_APP)
        ? NotificationChannel.IN_APP
        : channelsToUse[0];
      const rendered = this.rendererService.render(payload.event, defaultChannel, payload.data);

      const notificationIds = await this.createNotificationRecords(payload, rendered, channelsToUse);

      if (payload.priority === NotificationPriority.HIGH || EVENT_PRIORITY_MAP?.has?.(payload.event)) {
        await this.sendToChannels(payload, channelsToUse, notificationIds);
      } else {
        await this.queueNotification(payload, rendered, channelsToUse, notificationIds);
      }

      this.eventEmitter.emit('notification.dispatched', {
        tenantId: payload.tenantId, userId: payload.userId,
        event: payload.event, priority: payload.priority, channels: channelsToUse,
      });
    } catch (error) {
      this.logger.error(`Failed to dispatch notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendNow(payload: NotificationPayload): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    const enabledChannels = await this.preferenceService.getEnabledChannels(payload.tenantId, payload.userId, payload.event);

    for (const channel of enabledChannels) {
      try {
        const rendered = this.rendererService.render(payload.event, channel, payload.data);
        const result = await this.sendToChannel(channel, payload, rendered);
        results.push(result);
      } catch (error) {
        results.push({ success: false, channel, error: error.message });
      }
    }
    return results;
  }

  async retryFailed(tenantId: string): Promise<void> {
    const failed = await this.notificationRepository.findFailed(tenantId);
    for (const notification of failed) {
      try {
        await this.notificationRepository.incrementRetry(notification.id);
        const payload: NotificationPayload = {
          tenantId: notification.tenantId, userId: notification.userId,
          event: notification.triggerEvent as NotificationTriggerEvent,
          priority: notification.priority as NotificationPriority,
          channels: [notification.channel as NotificationChannel],
          recipient: notification.recipient,
          data: notification.metadata as Record<string, any>,
        };
        const result = await this.sendNow(payload);
        const success = result.find(r => r.channel === notification.channel);
        await this.notificationRepository.updateStatus(
          notification.id,
          success?.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          success?.success ? { sentAt: new Date() } : { errorMessage: success?.error },
        );
      } catch (error) {
        this.logger.error(`Failed to retry notification ${notification.id}: ${error.message}`);
      }
    }
  }

  async bulkDispatch(payloads: NotificationPayload[]): Promise<void> {
    const chunks = this.chunkArray(payloads, 50);
    for (const chunk of chunks) {
      await Promise.all(chunk.map(p => this.dispatch(p)));
    }
  }

  async sendDigest(tenantId: string, userId: string): Promise<void> {
    const digestCandidates = await this.notificationRepository.findDigestCandidates(tenantId, userId);
    if (digestCandidates.length === 0) return;

    const payload: NotificationPayload = {
      tenantId, userId,
      event: NotificationTriggerEvent.SCHEDULE_POSTED,
      priority: NotificationPriority.LOW,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      recipient: userId,
      data: {
        title: `Your Daily Digest (${digestCandidates.length} notifications)`,
        items: digestCandidates,
      },
    };
    await this.dispatch(payload);
  }

  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(), this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(), this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  async clearQueue(): Promise<void> {
    await this.notificationQueue.empty();
    this.logger.log('Notification queue cleared');
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private filterChannelsByPriority(channels: NotificationChannel[], priority: NotificationPriority): NotificationChannel[] {
    const allowed = PRIORITY_CHANNEL_RULES[priority] || PRIORITY_CHANNEL_RULES[NotificationPriority.LOW];
    return channels.filter(c => allowed.includes(c));
  }

  private async createNotificationRecords(
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
    channels: NotificationChannel[],
  ): Promise<Map<NotificationChannel, string>> {
    const ids = new Map<NotificationChannel, string>();
    for (const channel of channels) {
      const record = await this.notificationRepository.create({
        tenantId: payload.tenantId, userId: payload.userId, channel,
        recipient: payload.recipient, title: rendered.title, body: rendered.body,
        status: NotificationStatus.PENDING, priority: payload.priority,
        triggerEvent: payload.event, actions: rendered.actions, metadata: payload.data,
        expiresAt: payload.expiresInMinutes ? new Date(Date.now() + payload.expiresInMinutes * 60_000) : undefined,
      });
      ids.set(channel, record.id);
    }
    return ids;
  }

  private async sendToChannels(
    payload: NotificationPayload,
    channels: NotificationChannel[],
    notificationIds: Map<NotificationChannel, string>,
  ): Promise<void> {
    await Promise.all(
      channels.map(async (channel) => {
        const id = notificationIds.get(channel);
        try {
          // Render per-channel for correct template
          const rendered = this.rendererService.render(payload.event, channel, payload.data);
          const result = await this.sendToChannel(channel, payload, rendered);
          await this.notificationRepository.updateStatus(
            id!, result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
            result.success ? { sentAt: new Date() } : { errorMessage: result.error },
          );
        } catch (error) {
          await this.notificationRepository.updateStatus(id!, NotificationStatus.FAILED, { errorMessage: error.message });
        }
      }),
    );
  }

  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
  ): Promise<DispatchResult> {
    // FIXED: channels accept a single ChannelPayload arg (not payload + rendered separately)
    const channelPayload: ChannelPayload = {
      tenantId: payload.tenantId, userId: payload.userId,
      recipient: payload.recipient, title: rendered.title, body: rendered.body,
      priority: payload.priority, triggerEvent: payload.event,
      actions: rendered.actions,
      expiresAt: payload.expiresInMinutes ? new Date(Date.now() + payload.expiresInMinutes * 60_000) : undefined,
    };

    try {
      switch (channel) {
        case NotificationChannel.IN_APP:  await this.inAppChannel.send(channelPayload);  break;
        case NotificationChannel.EMAIL:   await this.emailChannel.send(channelPayload);  break;
        case NotificationChannel.SMS:     await this.smsChannel.send(channelPayload);    break;
        case NotificationChannel.WHATSAPP:
          this.logger.warn('WhatsApp channel not implemented yet');
          break;
        default: throw new Error(`Unknown channel: ${channel}`);
      }
      return { success: true, channel };
    } catch (error) {
      this.logger.error(`Failed to send via ${channel}: ${error.message}`);
      return { success: false, channel, error: error.message };
    }
  }

  private async queueNotification(
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
    channels: NotificationChannel[],
    notificationIds: Map<NotificationChannel, string>,
  ): Promise<void> {
    await this.notificationQueue.add('send', {
      payload, rendered, channels,
      notificationIds: Array.from(notificationIds.entries()),
    }, {
      delay: payload.priority === NotificationPriority.MEDIUM ? 0 : 30_000,
      attempts: 3, backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true, removeOnFail: false,
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
  }
}