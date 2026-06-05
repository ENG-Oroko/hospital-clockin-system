// services/dispatcher.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTriggerEvent,
  NotificationPayload,
  DispatchResult,
  PRIORITY_CHANNEL_RULES,
  HIGH_PRIORITY_EVENTS,
} from '../types/notification.types';
import { NotificationRepository } from '../repositories/notification.repository';
import { PreferenceService } from './preference.service';
import { RendererService } from './renderer.service';
import { InAppChannel } from '../channels/in-app.channel';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';

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

  /**
   * Main dispatch method - routes notification to appropriate channels
   */
  async dispatch(payload: NotificationPayload): Promise<void> {
    this.logger.debug(`Dispatching notification: ${payload.event} to ${payload.userId}`);

    try {
      // Get enabled channels for this user and event
      const enabledChannels = await this.preferenceService.getEnabledChannels(
        payload.tenantId,
        payload.userId,
        payload.event,
      );

      // Filter channels based on priority and user preferences
      const channelsToUse = this.filterChannelsByPriority(
        enabledChannels,
        payload.priority,
      );

      if (channelsToUse.length === 0) {
        this.logger.warn(`No enabled channels for notification: ${payload.event}`);
        return;
      }

      // Render notification content
      const rendered = await this.rendererService.render(
        payload.event,
        payload.data,
      );

      // Create notification records for each channel
      const notificationIds = await this.createNotificationRecords(
        payload,
        rendered,
        channelsToUse,
      );

      // Send based on priority
      if (payload.priority === NotificationPriority.HIGH) {
        // Send immediately for high priority
        await this.sendToChannels(payload, rendered, channelsToUse, notificationIds);
      } else {
        // Queue for processing
        await this.queueNotification(payload, rendered, channelsToUse, notificationIds);
      }

      // Emit event for analytics
      this.eventEmitter.emit('notification.dispatched', {
        tenantId: payload.tenantId,
        userId: payload.userId,
        event: payload.event,
        priority: payload.priority,
        channels: channelsToUse,
      });
    } catch (error) {
      this.logger.error(`Failed to dispatch notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send notification to specific user immediately
   */
  async sendNow(payload: NotificationPayload): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];
    const enabledChannels = await this.preferenceService.getEnabledChannels(
      payload.tenantId,
      payload.userId,
      payload.event,
    );

    const rendered = await this.rendererService.render(payload.event, payload.data);

    for (const channel of enabledChannels) {
      try {
        const result = await this.sendToChannel(channel, payload, rendered);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          channel,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Retry failed notifications
   */
  async retryFailed(tenantId: string): Promise<void> {
    const failed = await this.notificationRepository.findFailed(tenantId);
    
    for (const notification of failed) {
      try {
        await this.notificationRepository.incrementRetry(notification.id);
        
        const payload: NotificationPayload = {
          tenantId: notification.tenantId,
          userId: notification.userId,
          event: notification.triggerEvent as NotificationTriggerEvent,
          priority: notification.priority as NotificationPriority,
          channels: [notification.channel],
          recipient: notification.recipient,
          data: notification.metadata as Record<string, any>,
        };

        const rendered = {
          title: notification.title,
          body: notification.body,
          actions: notification.actions as any,
        };

        const result = await this.sendToChannel(
          notification.channel as NotificationChannel,
          payload,
          rendered,
        );

        if (result.success) {
          await this.notificationRepository.updateStatus(
            notification.id,
            NotificationStatus.SENT,
            { sentAt: new Date() },
          );
        } else {
          await this.notificationRepository.updateStatus(
            notification.id,
            NotificationStatus.FAILED,
            { errorMessage: result.error },
          );
        }
      } catch (error) {
        this.logger.error(`Failed to retry notification ${notification.id}: ${error.message}`);
      }
    }
  }

  /**
   * Send bulk notifications
   */
  async bulkDispatch(payloads: NotificationPayload[]): Promise<void> {
    const chunks = this.chunkArray(payloads, 50);
    
    for (const chunk of chunks) {
      await Promise.all(chunk.map(payload => this.dispatch(payload)));
    }
  }

  /**
   * Send digest notifications (batched low priority)
   */
  async sendDigest(tenantId: string, userId: string): Promise<void> {
    const digestCandidates = await this.notificationRepository.findDigestCandidates(
      tenantId,
      userId,
    );

    if (digestCandidates.length === 0) {
      return;
    }

    const digestTitle = `Your Daily Digest (${digestCandidates.length} notifications)`;
    const digestBody = this.buildDigestBody(digestCandidates);

    const payload: NotificationPayload = {
      tenantId,
      userId,
      event: NotificationTriggerEvent.SCHEDULE_POSTED,
      priority: NotificationPriority.LOW,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      recipient: userId,
      data: {
        title: digestTitle,
        body: digestBody,
        items: digestCandidates,
      },
    };

    await this.dispatch(payload);
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Clear queue
   */
  async clearQueue(): Promise<void> {
    await this.notificationQueue.empty();
    this.logger.log('Notification queue cleared');
  }

  // ==================== Private Methods ====================

  private filterChannelsByPriority(
    channels: NotificationChannel[],
    priority: NotificationPriority,
  ): NotificationChannel[] {
    const allowedChannels = PRIORITY_CHANNEL_RULES[priority] || PRIORITY_CHANNEL_RULES[NotificationPriority.LOW];
    return channels.filter(channel => allowedChannels.includes(channel));
  }

  private async createNotificationRecords(
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
    channels: NotificationChannel[],
  ): Promise<Map<NotificationChannel, string>> {
    const notificationIds = new Map<NotificationChannel, string>();

    for (const channel of channels) {
      const record = await this.notificationRepository.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        channel,
        recipient: payload.recipient,
        title: rendered.title,
        body: rendered.body,
        status: NotificationStatus.PENDING,
        priority: payload.priority,
        triggerEvent: payload.event,
        actions: rendered.actions,
        metadata: payload.data,
        expiresAt: payload.expiresInMinutes 
          ? new Date(Date.now() + payload.expiresInMinutes * 60 * 1000)
          : undefined,
      });
      notificationIds.set(channel, record.id);
    }

    return notificationIds;
  }

  private async sendToChannels(
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
    channels: NotificationChannel[],
    notificationIds: Map<NotificationChannel, string>,
  ): Promise<void> {
    const sendPromises = channels.map(async (channel) => {
      const notificationId = notificationIds.get(channel);
      try {
        const result = await this.sendToChannel(channel, payload, rendered);
        
        if (result.success) {
          await this.notificationRepository.updateStatus(notificationId, NotificationStatus.SENT, {
            sentAt: new Date(),
          });
        } else {
          await this.notificationRepository.updateStatus(notificationId, NotificationStatus.FAILED, {
            errorMessage: result.error,
          });
        }
        
        return result;
      } catch (error) {
        await this.notificationRepository.updateStatus(notificationId, NotificationStatus.FAILED, {
          errorMessage: error.message,
        });
        return {
          success: false,
          channel,
          error: error.message,
        };
      }
    });

    await Promise.all(sendPromises);
  }

  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
  ): Promise<DispatchResult> {
    try {
      switch (channel) {
        case NotificationChannel.IN_APP:
          await this.inAppChannel.send(payload, rendered);
          break;
        case NotificationChannel.EMAIL:
          await this.emailChannel.send(payload, rendered);
          break;
        case NotificationChannel.SMS:
          await this.smsChannel.send(payload, rendered);
          break;
        case NotificationChannel.WHATSAPP:
          // Implement WhatsApp channel if needed
          this.logger.warn('WhatsApp channel not implemented yet');
          break;
        default:
          throw new Error(`Unknown channel: ${channel}`);
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
    const delay = payload.priority === NotificationPriority.MEDIUM ? 0 : 30000; // 30 sec delay for low priority
    
    await this.notificationQueue.add(
      'send',
      {
        payload,
        rendered,
        channels,
        notificationIds: Array.from(notificationIds.entries()),
      },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  private buildDigestBody(notifications: any[]): string {
    const grouped = notifications.reduce((acc, notif) => {
      const type = notif.triggerEvent;
      if (!acc[type]) acc[type] = [];
      acc[type].push(notif);
      return acc;
    }, {});

    let body = 'Here is your daily summary:\n\n';
    
    for (const [type, items] of Object.entries(grouped)) {
      body += `📌 ${type}: ${(items as any[]).length} notification(s)\n`;
      for (const item of items as any[]) {
        body += `   • ${item.title}\n`;
      }
      body += '\n';
    }
    
    return body;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}