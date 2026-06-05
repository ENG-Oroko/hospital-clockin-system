import { NotificationChannel, NotificationPriority, NotificationStatus, NotificationTriggerEvent } from '../types/notification.types';
import { NotificationAction } from '../types/notification.types';

export class NotificationEntity {
  id: string;
  tenantId: string;
  userId: string;
  channel: NotificationChannel;
  recipient: string;
  title: string;
  body: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  triggerEvent?: NotificationTriggerEvent;
  actions?: NotificationAction[];
  retryCount: number;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export class PaginatedNotificationResponseDto {
  data: NotificationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export class NotificationSummaryDto {
  total: number;
  unread: number;
  byPriority: Record<NotificationPriority, number>;
  byStatus: Record<NotificationStatus, number>;
  lastNotificationAt?: Date;
}

export class NotificationResponseDto extends NotificationEntity {}

export class MarkAsReadDto {
  notificationIds: string[];
}

export class NotificationAdminStatsDto {
  total: number;
  sent: number;
  failed: number;
  read: number;
  deliveryRate: number;
  readRate: number;
  byChannel: Record<NotificationChannel, number>;
  byEvent: Record<string, number>;
  failureRate: number;
}