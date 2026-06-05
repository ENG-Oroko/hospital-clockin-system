// entities/notification-digest.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Notification Digest Entity
 * Stores batched digest notifications for daily/weekly summaries
 */
@Entity('notification_digests')
@Index(['tenantId', 'userId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['tenantId', 'status'])
export class NotificationDigestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 50,
    comment: 'daily, weekly, or monthly',
  })
  type: string;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 200,
  })
  title: string;

  @Column({
    name: 'body',
    type: 'text',
  })
  body: string;

  @Column({
    name: 'items',
    type: 'jsonb',
    default: [],
  })
  items: Array<{
    id: string;
    title: string;
    body: string;
    event: string;
    channel: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  }>;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'pending, sent, failed, cancelled',
  })
  status: string;

  @Column({
    name: 'message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  messageId: string;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
  })
  errorMessage: string;

  @Column({
    name: 'sent_at',
    type: 'timestamptz',
    nullable: true,
  })
  sentAt: Date;

  @Column({
    name: 'scheduled_for',
    type: 'timestamptz',
    nullable: true,
  })
  scheduledFor: Date;

  @Column({
    name: 'notification_count',
    type: 'int',
    default: 0,
  })
  notificationCount: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Virtual properties
  get isSent(): boolean {
    return this.status === 'sent';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  // Helper methods
  markAsSent(messageId: string): void {
    this.status = 'sent';
    this.messageId = messageId;
    this.sentAt = new Date();
  }

  markAsFailed(error: string): void {
    this.status = 'failed';
    this.errorMessage = error;
  }

  markAsCancelled(): void {
    this.status = 'cancelled';
  }

  addItem(item: {
    id: string;
    title: string;
    body: string;
    event: string;
    channel: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  }): void {
    this.items.push(item);
    this.notificationCount = this.items.length;
  }

  addItems(items: Array<{
    id: string;
    title: string;
    body: string;
    event: string;
    channel: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  }>): void {
    this.items.push(...items);
    this.notificationCount = this.items.length;
  }

  getSummary(): {
    totalCount: number;
    eventBreakdown: Record<string, number>;
    channelBreakdown: Record<string, number>;
    oldestItem: Date | null;
    newestItem: Date | null;
  } {
    const eventBreakdown: Record<string, number> = {};
    const channelBreakdown: Record<string, number> = {};
    let oldestItem: Date | null = null;
    let newestItem: Date | null = null;

    for (const item of this.items) {
      // Event breakdown
      eventBreakdown[item.event] = (eventBreakdown[item.event] || 0) + 1;

      // Channel breakdown
      channelBreakdown[item.channel] = (channelBreakdown[item.channel] || 0) + 1;

      // Date ranges
      const itemDate = new Date(item.createdAt);
      if (!oldestItem || itemDate < oldestItem) oldestItem = itemDate;
      if (!newestItem || itemDate > newestItem) newestItem = itemDate;
    }

    return {
      totalCount: this.notificationCount,
      eventBreakdown,
      channelBreakdown,
      oldestItem,
      newestItem,
    };
  }

  shouldSend(): boolean {
    return this.status === 'pending' && this.notificationCount > 0;
  }
}

/**
 * DTO for creating a notification digest
 */
export class CreateNotificationDigestDto {
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  items?: Array<{
    id: string;
    title: string;
    body: string;
    event: string;
    channel: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  }>;
  scheduledFor?: Date;
}

/**
 * DTO for updating a notification digest
 */
export class UpdateNotificationDigestDto {
  title?: string;
  body?: string;
  status?: string;
  messageId?: string;
  errorMessage?: string;
  sentAt?: Date;
  scheduledFor?: Date;
}

/**
 * DTO for adding items to digest
 */
export class AddDigestItemsDto {
  items: Array<{
    id: string;
    title: string;
    body: string;
    event: string;
    channel: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Response DTO for notification digest
 */
export class NotificationDigestResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
    event: string;
    channel: string;
    createdAt: Date;
    metadata?: Record<string, any>;
  }>;
  status: string;
  messageId?: string;
  errorMessage?: string;
  notificationCount: number;
  sentAt?: Date;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
  isSent: boolean;
  isFailed: boolean;
  isPending: boolean;
  summary: {
    totalCount: number;
    eventBreakdown: Record<string, number>;
    channelBreakdown: Record<string, number>;
    oldestItem: Date | null;
    newestItem: Date | null;
  };

  constructor(entity: NotificationDigestEntity) {
    this.id = entity.id;
    this.tenantId = entity.tenantId;
    this.userId = entity.userId;
    this.type = entity.type;
    this.title = entity.title;
    this.body = entity.body;
    this.items = entity.items;
    this.status = entity.status;
    this.messageId = entity.messageId;
    this.errorMessage = entity.errorMessage;
    this.notificationCount = entity.notificationCount;
    this.sentAt = entity.sentAt;
    this.scheduledFor = entity.scheduledFor;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.isSent = entity.isSent;
    this.isFailed = entity.isFailed;
    this.isPending = entity.isPending;
    this.summary = entity.getSummary();
  }
}

/**
 * Paginated digest response DTO
 */
export class PaginatedDigestResponseDto {
  data: NotificationDigestResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  constructor(
    data: NotificationDigestEntity[],
    total: number,
    page: number,
    limit: number,
  ) {
    this.data = data.map(entity => new NotificationDigestResponseDto(entity));
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}

/**
 * Digest generation options
 */
export interface DigestGenerationOptions {
  type: 'daily' | 'weekly' | 'monthly';
  timezone?: string;
  deliveryHour?: number;
  includeEvents?: string[];
  excludeEvents?: string[];
  maxItems?: number;
}

/**
 * Digest statistics DTO
 */
export class DigestStatisticsDto {
  totalDigests: number;
  sentDigests: number;
  failedDigests: number;
  pendingDigests: number;
  totalNotificationsDigested: number;
  averageItemsPerDigest: number;
  byType: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  last7Days: Array<{
    date: string;
    count: number;
  }>;

  constructor() {
    this.totalDigests = 0;
    this.sentDigests = 0;
    this.failedDigests = 0;
    this.pendingDigests = 0;
    this.totalNotificationsDigested = 0;
    this.averageItemsPerDigest = 0;
    this.byType = { daily: 0, weekly: 0, monthly: 0 };
    this.last7Days = [];
  }
}