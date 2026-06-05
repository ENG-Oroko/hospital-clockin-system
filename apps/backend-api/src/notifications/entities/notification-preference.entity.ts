// entities/notification-preference.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import { NotificationTriggerEvent, NotificationChannel } from '../types/notification.types';

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: NotificationTriggerEvent })
  event: NotificationTriggerEvent;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  mandatory: boolean;
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: NotificationTriggerEvent })
  event: NotificationTriggerEvent;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty()
  enabled: boolean;
}

export class BulkUpdateNotificationPreferenceDto {
  @ApiProperty({ type: [UpdateNotificationPreferenceDto] })
  preferences: UpdateNotificationPreferenceDto[];
}

export class UserNotificationSettingsResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  quietHoursEnabled: boolean;

  @ApiProperty({ nullable: true })
  quietHoursStart?: string;

  @ApiProperty({ nullable: true })
  quietHoursEnd?: string;

  @ApiProperty()
  digestEnabled: boolean;

  @ApiProperty()
  digestFrequency: string;

  @ApiProperty()
  emailDigest: boolean;

  @ApiProperty()
  pushDigest: boolean;
}

export class UpdateUserNotificationSettingsDto {
  @ApiProperty({ required: false })
  quietHoursEnabled?: boolean;

  @ApiProperty({ required: false })
  quietHoursStart?: string;

  @ApiProperty({ required: false })
  quietHoursEnd?: string;

  @ApiProperty({ required: false })
  digestEnabled?: boolean;

  @ApiProperty({ required: false })
  digestFrequency?: string;

  @ApiProperty({ required: false })
  emailDigest?: boolean;

  @ApiProperty({ required: false })
  pushDigest?: boolean;
}

// Other DTOs needed for controller
export class MarkAsReadDto {
  @ApiProperty({ type: [String] })
  notificationIds: string[];
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationSummaryDto {
  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  hasUnread: boolean;

  @ApiProperty({ type: [NotificationResponseDto] })
  recentNotifications: NotificationResponseDto[];
}

export class PaginatedNotificationResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items: NotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}