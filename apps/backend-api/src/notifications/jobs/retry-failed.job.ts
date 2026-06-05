// jobs/retry-failed.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationRepository } from '../repositories/notification.repository';
import { DispatcherService } from '../services/dispatcher.service';
import {
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationTriggerEvent,
} from '../types/notification.types';

export interface RetryJobConfig {
  maxRetries: number;
  retryDelays: number[]; // in milliseconds
  batchSize: number;
  enabled: boolean;
}

@Injectable()
export class RetryFailedJob {
  private readonly logger = new Logger(RetryFailedJob.name);
  private readonly config: RetryJobConfig = {
    maxRetries: 3,
    retryDelays: [5000, 15000, 30000], // 5s, 15s, 30s
    batchSize: 50,
    enabled: true,
  };

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly dispatcherService: DispatcherService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run every 5 minutes to retry failed notifications
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug('Retry job is disabled');
      return;
    }

    this.logger.log('Starting failed notifications retry job...');
    const startTime = Date.now();

    try {
      // Get all tenants (in a real implementation, you'd get from tenant service)
      const tenants = await this.getTenants();
      
      let totalRetried = 0;
      let totalSuccess = 0;
      let totalFailed = 0;

      for (const tenantId of tenants) {
        const result = await this.processTenantFailures(tenantId);
        totalRetried += result.retried;
        totalSuccess += result.success;
        totalFailed += result.failed;
      }

      const duration = Date.now() - startTime;
      
      this.logger.log(
        `Retry job completed in ${duration}ms: ` +
        `Retried: ${totalRetried}, Success: ${totalSuccess}, Failed: ${totalFailed}`,
      );

      // Emit event for monitoring
      this.eventEmitter.emit('notification.retry.completed', {
        totalRetried,
        totalSuccess,
        totalFailed,
        duration,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Retry job failed: ${error.message}`, error.stack);
      
      this.eventEmitter.emit('notification.retry.failed', {
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Retry specific notification by ID
   */
  async retryNotification(notificationId: string): Promise<boolean> {
    this.logger.log(`Manually retrying notification: ${notificationId}`);
    
    try {
      const notification = await this.notificationRepository.findById(
        notificationId,
        '', // tenantId would be needed in real implementation
      );

      if (!notification) {
        this.logger.warn(`Notification ${notificationId} not found`);
        return false;
      }

      if (notification.retryCount >= this.config.maxRetries) {
        this.logger.warn(`Notification ${notificationId} exceeded max retries`);
        return false;
      }

      return await this.retrySingleNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to retry notification ${notificationId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Retry all failed notifications for a tenant
   */
  async retryAllForTenant(tenantId: string): Promise<{
    retried: number;
    success: number;
    failed: number;
  }> {
    this.logger.log(`Retrying all failed notifications for tenant: ${tenantId}`);
    return await this.processTenantFailures(tenantId, true);
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(tenantId: string): Promise<{
    pendingRetries: number;
    maxRetriesReached: number;
    averageRetryCount: number;
    retrySuccessRate: number;
  }> {
    const failed = await this.notificationRepository.findFailed(tenantId);
    
    const pendingRetries = failed.filter(n => n.retryCount < this.config.maxRetries).length;
    const maxRetriesReached = failed.filter(n => n.retryCount >= this.config.maxRetries).length;
    const averageRetryCount = failed.reduce((sum, n) => sum + n.retryCount, 0) / (failed.length || 1);
    
    // Calculate success rate from history (would need tracking)
    const retrySuccessRate = 0; // Implement based on your tracking
    
    return {
      pendingRetries,
      maxRetriesReached,
      averageRetryCount,
      retrySuccessRate,
    };
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryJobConfig>): void {
    Object.assign(this.config, config);
    this.logger.log(`Retry config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * Enable/disable retry job
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.logger.log(`Retry job ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ==================== Private Methods ====================

  private async processTenantFailures(
    tenantId: string,
    retryAll = false,
  ): Promise<{ retried: number; success: number; failed: number }> {
    const failedNotifications = await this.notificationRepository.findFailed(tenantId);
    
    // Filter notifications that can be retried
    const retryable = failedNotifications.filter(n => 
      retryAll || n.retryCount < this.config.maxRetries,
    );
    
    // Limit batch size
    const toRetry = retryable.slice(0, this.config.batchSize);
    
    let success = 0;
    let failed = 0;

    for (const notification of toRetry) {
      const retrySuccess = await this.retrySingleNotification(notification);
      
      if (retrySuccess) {
        success++;
      } else {
        failed++;
      }
      
      // Add delay between retries to avoid rate limiting
      await this.delay(1000);
    }

    return {
      retried: toRetry.length,
      success,
      failed,
    };
  }

  private async retrySingleNotification(notification: any): Promise<boolean> {
    try {
      // Increment retry count
      await this.notificationRepository.incrementRetry(
        notification.id,
        `Retry attempt ${notification.retryCount + 1}`,
      );

      // Calculate delay based on retry attempt
      const retryAttempt = notification.retryCount + 1;
      const delayMs = this.getRetryDelay(retryAttempt);
      
      // Wait before retrying
      if (delayMs > 0) {
        await this.delay(delayMs);
      }

      // Prepare payload for retry
      const payload = {
        tenantId: notification.tenantId,
        userId: notification.userId,
        event: notification.triggerEvent as NotificationTriggerEvent,
        priority: notification.priority as NotificationPriority,
        channels: [notification.channel as NotificationChannel],
        recipient: notification.recipient,
        data: notification.metadata as Record<string, any>,
        expiresInMinutes: notification.expiresAt 
          ? Math.max(0, Math.ceil((new Date(notification.expiresAt).getTime() - Date.now()) / 60000))
          : undefined,
      };

      // Render content
      const rendered = {
        title: notification.title,
        body: notification.body,
        actions: notification.actions as any[],
      };

      // Send the notification
      const result = await this.dispatcherService.sendNow(payload);
      
      const channelResult = result.find(r => r.channel === notification.channel);
      
      if (channelResult?.success) {
        // Mark as sent on success
        await this.notificationRepository.updateStatus(
          notification.id,
          NotificationStatus.SENT,
          { sentAt: new Date() },
        );
        
        this.logger.log(
          `Successfully retried notification ${notification.id} (attempt ${retryAttempt})`,
        );
        
        // Emit success event
        this.eventEmitter.emit('notification.retry.success', {
          notificationId: notification.id,
          attempt: retryAttempt,
          timestamp: new Date(),
        });
        
        return true;
      } else {
        throw new Error(channelResult?.error || 'Retry failed');
      }
    } catch (error) {
      const newRetryCount = notification.retryCount + 1;
      
      if (newRetryCount >= this.config.maxRetries) {
        // Mark as permanently failed
        await this.notificationRepository.updateStatus(
          notification.id,
          NotificationStatus.FAILED,
          { errorMessage: `Max retries exceeded: ${error.message}` },
        );
        
        this.logger.error(
          `Notification ${notification.id} permanently failed after ${newRetryCount} attempts`,
        );
        
        // Emit permanent failure event
        this.eventEmitter.emit('notification.retry.permanent_failure', {
          notificationId: notification.id,
          attempts: newRetryCount,
          error: error.message,
          timestamp: new Date(),
        });
      } else {
        // Keep as failed for next retry
        await this.notificationRepository.updateStatus(
          notification.id,
          NotificationStatus.FAILED,
          { errorMessage: `Retry ${newRetryCount} failed: ${error.message}` },
        );
        
        this.logger.warn(
          `Retry ${newRetryCount} failed for notification ${notification.id}: ${error.message}`,
        );
        
        // Emit retry failure event
        this.eventEmitter.emit('notification.retry.attempt_failed', {
          notificationId: notification.id,
          attempt: newRetryCount,
          error: error.message,
          nextRetryIn: this.getRetryDelay(newRetryCount + 1),
          timestamp: new Date(),
        });
      }
      
      return false;
    }
  }

  private getRetryDelay(attempt: number): number {
    const index = Math.min(attempt - 1, this.config.retryDelays.length - 1);
    return this.config.retryDelays[index] || 60000; // Default to 60 seconds
  }

  private async getTenants(): Promise<string[]> {
    // In a real implementation, fetch from tenant service
    // For now, return a mock or query from database
    try {
      // This assumes you have a way to get all tenants
      // const tenants = await this.tenantRepository.findAll();
      // return tenants.map(t => t.id);
      
      // Mock implementation - in production, replace with actual tenant query
      const result = await this.notificationRepository.getDistinctTenants();
      return result;
    } catch (error) {
      this.logger.warn('Could not fetch tenants, using empty array');
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}