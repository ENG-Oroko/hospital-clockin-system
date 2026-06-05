import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationTriggerEvent,
  NotificationAction,
  DispatchResult,
} from '../types/notification.types';

export interface ChannelPayload {
  tenantId: string;
  userId: string;
  recipient: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  triggerEvent?: NotificationTriggerEvent;
  actions?: NotificationAction[];
  expiresAt?: Date;
}

@Injectable()
export class InAppChannel {
  private readonly logger = new Logger(InAppChannel.name);

  constructor(private readonly repo: NotificationRepository) {}

  async send(payload: ChannelPayload): Promise<DispatchResult> {
    try {
      await this.repo.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        channel: NotificationChannel.IN_APP,
        recipient: payload.recipient,
        title: payload.title,
        body: payload.body,
        status: NotificationStatus.DELIVERED,
        priority: payload.priority,
        triggerEvent: payload.triggerEvent,
        actions: payload.actions,
        expiresAt: payload.expiresAt,
      });

      this.logger.debug(`In-app delivered to user ${payload.userId}`);
      return { success: true, channel: NotificationChannel.IN_APP };
    } catch (error) {
      this.logger.error(`In-app failed: ${error.message}`);
      return { success: false, channel: NotificationChannel.IN_APP, error: error.message };
    }
  }
}