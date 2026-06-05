// jobs/send-notification.job.ts
import { Processor, Process, OnQueueFailed, OnQueueCompleted, OnQueueActive } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTriggerEvent,
  NotificationPayload,
} from '../types/notification.types';
import { NotificationRepository } from '../repositories/notification.repository';
import { InAppChannel } from '../channels/in-app.channel';
import { EmailChannel } from '../channels/email.channel';
import { SmsChannel } from '../channels/sms.channel';
import { RendererService } from '../services/renderer.service';

export interface SendNotificationJobData {
  payload: NotificationPayload;
  rendered: {
    title: string;
    body: string;
    actions?: any[];
  };
  channels: NotificationChannel[];
  notificationIds: Array<[NotificationChannel, string]>;
  retryCount?: number;
  correlationId?: string;
}

export interface JobResult {
  success: boolean;
  channel: NotificationChannel;
  notificationId: string;
  error?: string;
  sentAt?: Date;
}

@Processor('notifications')
export class SendNotificationJob {
  private readonly logger = new Logger(SendNotificationJob.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [5000, 15000, 30000, 60000]; // 5s, 15s, 30s, 60s

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
    private readonly rendererService: RendererService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process individual notification job
   */
  @Process('send')
  async handleSendNotification(job: Job<SendNotificationJobData>): Promise<JobResult[]> {
    const startTime = Date.now();
    const { payload, rendered, channels, notificationIds, correlationId } = job.data;
    
    this.logger.log(`Processing notification job ${job.id} for event: ${payload.event}, user: ${payload.userId}, channels: ${channels.join(', ')}`);
    
    const results: JobResult[] = [];
    
    try {
      // Process each channel in parallel
      const channelPromises = channels.map(async (channel) => {
        const notificationId = this.getNotificationIdForChannel(notificationIds, channel);
        
        if (!notificationId) {
          this.logger.error(`No notification ID found for channel: ${channel}`);
          return {
            success: false,
            channel,
            notificationId: '',
            error: 'No notification ID found',
          };
        }
        
        try {
          // Update status to processing
          await this.notificationRepository.updateStatus(notificationId, NotificationStatus.PENDING);
          
          // Send via appropriate channel
          const result = await this.sendViaChannel(channel, payload, rendered);
          
          if (result.success) {
            // Mark as sent
            await this.notificationRepository.updateStatus(notificationId, NotificationStatus.SENT, {
              sentAt: result.sentAt || new Date(),
            });
            
            this.logger.debug(`Successfully sent notification ${notificationId} via ${channel}`);
            
            // Emit success event
            this.eventEmitter.emit('notification.sent', {
              jobId: job.id,
              notificationId,
              channel,
              userId: payload.userId,
              event: payload.event,
              correlationId,
              duration: Date.now() - startTime,
            });
            
            return {
              success: true,
              channel,
              notificationId,
              sentAt: result.sentAt,
            };
          } else {
            // Mark as failed
            await this.notificationRepository.updateStatus(notificationId, NotificationStatus.FAILED, {
              errorMessage: result.error,
            });
            
            this.logger.warn(`Failed to send notification ${notificationId} via ${channel}: ${result.error}`);
            
            // Emit failure event
            this.eventEmitter.emit('notification.failed', {
              jobId: job.id,
              notificationId,
              channel,
              userId: payload.userId,
              event: payload.event,
              error: result.error,
              correlationId,
            });
            
            return {
              success: false,
              channel,
              notificationId,
              error: result.error,
            };
          }
        } catch (error) {
          // Handle unexpected errors
          await this.notificationRepository.updateStatus(notificationId, NotificationStatus.FAILED, {
            errorMessage: error.message,
          });
          
          this.logger.error(`Unexpected error sending notification ${notificationId} via ${channel}: ${error.message}`, error.stack);
          
          return {
            success: false,
            channel,
            notificationId,
            error: error.message,
          };
        }
      });
      
      // Wait for all channels to complete
      const channelResults = await Promise.all(channelPromises);
      results.push(...channelResults);
      
      // Calculate overall success
      const allSuccess = results.every(r => r.success);
      const partialSuccess = results.some(r => r.success) && !allSuccess;
      
      // Log completion
      const duration = Date.now() - startTime;
      this.logger.log(`Job ${job.id} completed in ${duration}ms. Success: ${results.filter(r => r.success).length}/${results.length}`);
      
      // Emit completion event
      this.eventEmitter.emit('notification.job.completed', {
        jobId: job.id,
        userId: payload.userId,
        event: payload.event,
        results,
        duration,
        correlationId,
        allSuccess,
        partialSuccess,
      });
      
      // If all failed, throw error to trigger retry
      if (!allSuccess && job.attemptsMade < this.MAX_RETRIES) {
        throw new Error(`Failed to send via all channels. Retry attempt ${job.attemptsMade + 1}`);
      }
      
      return results;
      
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      
      // Emit failure event
      this.eventEmitter.emit('notification.job.failed', {
        jobId: job.id,
        userId: payload.userId,
        event: payload.event,
        error: error.message,
        attemptsMade: job.attemptsMade + 1,
        correlationId,
      });
      
      throw error;
    }
  }

  /**
   * Process bulk notifications
   */
  @Process('bulk')
  async handleBulkNotifications(job: Job<{ notifications: SendNotificationJobData[] }>): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: JobResult[];
  }> {
    this.logger.log(`Processing bulk notification job ${job.id} with ${job.data.notifications.length} notifications`);
    
    const results: JobResult[] = [];
    let successful = 0;
    let failed = 0;
    
    // Process in batches to avoid overwhelming channels
    const batchSize = 10;
    for (let i = 0; i < job.data.notifications.length; i += batchSize) {
      const batch = job.data.notifications.slice(i, i + batchSize);
      const batchPromises = batch.map(notification => 
        this.handleSendNotification({ ...job, data: notification } as Job<SendNotificationJobData>)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        for (const r of result) {
          results.push(r);
          if (r.success) {
            successful++;
          } else {
            failed++;
          }
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < job.data.notifications.length) {
        await this.delay(1000);
      }
    }
    
    this.logger.log(`Bulk job ${job.id} completed. Success: ${successful}, Failed: ${failed}`);
    
    return {
      total: job.data.notifications.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Process digest notifications (batched low priority)
   */
  @Process('digest')
  async handleDigestNotification(job: Job<{
    tenantId: string;
    userId: string;
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      event: NotificationTriggerEvent;
      createdAt: Date;
    }>;
    digestType: 'daily' | 'weekly';
  }>): Promise<boolean> {
    this.logger.log(`Processing ${job.data.digestType} digest for user: ${job.data.userId}`);
    
    const { tenantId, userId, notifications, digestType } = job.data;
    
    if (notifications.length === 0) {
      this.logger.debug(`No notifications to digest for user: ${userId}`);
      return false;
    }
    
    try {
      // Group notifications by event type
      const grouped = this.groupNotificationsByEvent(notifications);
      
      // Generate digest content
      const digestTitle = this.generateDigestTitle(digestType, notifications.length);
      const digestBody = this.generateDigestBody(grouped, digestType);
      
      // Create digest record
      const digestRecord = await this.notificationRepository.createDigest({
        tenantId,
        userId,
        type: digestType,
        title: digestTitle,
        body: digestBody,
        items: notifications,
        status: 'pending',
      });
      
      // Send digest via email
      const emailResult = await this.emailChannel.sendDigest({
        tenantId,
        userId,
        recipient: userId, // Will be resolved to email
        title: digestTitle,
        body: digestBody,
        digestType,
        notificationCount: notifications.length,
        groupedNotifications: grouped,
      });
      
      if (emailResult.success) {
        await this.notificationRepository.updateDigestStatus(digestRecord.id, 'sent', emailResult.messageId);
        
        // Mark original notifications as digested
        for (const notification of notifications) {
          await this.notificationRepository.updateStatus(notification.id, NotificationStatus.DELIVERED);
        }
        
        this.logger.log(`Digest sent successfully to user: ${userId}`);
        return true;
      } else {
        await this.notificationRepository.updateDigestStatus(digestRecord.id, 'failed', emailResult.error);
        throw new Error(emailResult.error);
      }
      
    } catch (error) {
      this.logger.error(`Failed to send digest to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  @Process('retry')
  async handleRetryJob(job: Job<{
    notificationId: string;
    channel: NotificationChannel;
    attempt: number;
  }>): Promise<boolean> {
    this.logger.log(`Retrying notification ${job.data.notificationId} (attempt ${job.data.attempt})`);
    
    try {
      const notification = await this.notificationRepository.findById(
        job.data.notificationId,
        '', // tenantId would be needed
      );
      
      if (!notification) {
        this.logger.warn(`Notification ${job.data.notificationId} not found for retry`);
        return false;
      }
      
      // Prepare payload
      const payload: NotificationPayload = {
        tenantId: notification.tenantId,
        userId: notification.userId,
        event: notification.triggerEvent as NotificationTriggerEvent,
        priority: notification.priority as NotificationPriority,
        channels: [job.data.channel],
        recipient: notification.recipient,
        data: notification.metadata as Record<string, any>,
      };
      
      const rendered = {
        title: notification.title,
        body: notification.body,
        actions: notification.actions as any[],
      };
      
      // Send via channel
      const result = await this.sendViaChannel(job.data.channel, payload, rendered);
      
      if (result.success) {
        await this.notificationRepository.updateStatus(job.data.notificationId, NotificationStatus.SENT, {
          sentAt: result.sentAt,
        });
        
        this.logger.log(`Successfully retried notification ${job.data.notificationId}`);
        return true;
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.logger.error(`Failed to retry notification ${job.data.notificationId}: ${error.message}`);
      
      // Schedule next retry if under limit
      if (job.data.attempt < this.MAX_RETRIES) {
        const nextDelay = this.RETRY_DELAYS[job.data.attempt] || 60000;
        await job.queue.add('retry', job.data, { delay: nextDelay });
      }
      
      return false;
    }
  }

  // ==================== Queue Event Handlers ====================

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
    
    this.eventEmitter.emit('notification.job.permanent_failure', {
      jobId: job.id,
      error: error.message,
      attemptsMade: job.attemptsMade,
      data: job.data,
    });
  }

  // ==================== Private Helper Methods ====================

  private async sendViaChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    rendered: { title: string; body: string; actions?: any[] },
  ): Promise<{ success: boolean; error?: string; sentAt?: Date }> {
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
          this.logger.warn('WhatsApp channel not implemented');
          return { success: false, error: 'WhatsApp channel not implemented' };
          
        default:
          return { success: false, error: `Unknown channel: ${channel}` };
      }
      
      return { success: true, sentAt: new Date() };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private getNotificationIdForChannel(
    notificationIds: Array<[NotificationChannel, string]>,
    channel: NotificationChannel,
  ): string | undefined {
    const entry = notificationIds.find(([c]) => c === channel);
    return entry ? entry[1] : undefined;
  }

  private groupNotificationsByEvent(
    notifications: Array<{ id: string; title: string; body: string; event: NotificationTriggerEvent; createdAt: Date }>,
  ): Record<string, Array<{ title: string; body: string; createdAt: Date }>> {
    const grouped: Record<string, Array<{ title: string; body: string; createdAt: Date }>> = {};
    
    for (const notification of notifications) {
      const eventKey = notification.event;
      if (!grouped[eventKey]) {
        grouped[eventKey] = [];
      }
      grouped[eventKey].push({
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
      });
    }
    
    return grouped;
  }

  private generateDigestTitle(type: 'daily' | 'weekly', count: number): string {
    const period = type === 'daily' ? 'Daily' : 'Weekly';
    return `${period} Notification Digest - ${count} ${count === 1 ? 'update' : 'updates'}`;
  }

  private generateDigestBody(
    grouped: Record<string, Array<{ title: string; body: string; createdAt: Date }>>,
    digestType: 'daily' | 'weekly',
  ): string {
    let body = `Here is your ${digestType} summary of notifications:\n\n`;
    
    for (const [event, notifications] of Object.entries(grouped)) {
      body += `📌 ${this.formatEventName(event)} (${notifications.length})\n`;
      for (const notification of notifications) {
        body += `   • ${notification.title}\n`;
        body += `     ${notification.body.substring(0, 100)}${notification.body.length > 100 ? '...' : ''}\n`;
      }
      body += '\n';
    }
    
    body += `\nView all notifications: ${process.env.APP_URL}/notifications`;
    
    return body;
  }

  private formatEventName(event: string): string {
    return event
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}