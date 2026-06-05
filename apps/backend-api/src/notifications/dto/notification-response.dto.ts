// notifications/dto/notification-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

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
  type: string;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({ nullable: true })
  metadata: Record<string, any>;
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