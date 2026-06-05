// repositories/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTriggerEvent,
  NotificationAction,
} from '../types/notification.types';

export interface CreateNotificationRecord {
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
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationData {
  status?: NotificationStatus;
  readAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
  retryCount?: number;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: CreateNotificationRecord) {
    return this.db.notificationLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        channel: data.channel,
        recipient: data.recipient,
        title: data.title,
        body: data.body,
        status: data.status,
        priority: data.priority,
        triggerEvent: data.triggerEvent,
        actions: data.actions ? (data.actions as any) : undefined,
        metadata: data.metadata || undefined,
        expiresAt: data.expiresAt,
      },
    });
  }

  async updateStatus(id: string, status: NotificationStatus, extra?: { 
    readAt?: Date; 
    sentAt?: Date;
    deliveredAt?: Date;
    errorMessage?: string;
  }) {
    return this.db.notificationLog.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async update(id: string, data: UpdateNotificationData) {
    return this.db.notificationLog.update({
      where: { id },
      data,
    });
  }

  async incrementRetry(id: string, errorMessage?: string) {
    return this.db.notificationLog.update({
      where: { id },
      data: { 
        retryCount: { increment: 1 },
        errorMessage: errorMessage,
      },
    });
  }

  async findById(id: string, tenantId: string) {
    return this.db.notificationLog.findFirst({
      where: { id, tenantId },
    });
  }

  async findByUser(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20,
    filter?: { unreadOnly?: boolean; type?: NotificationTriggerEvent },
  ) {
    const where: any = { tenantId, userId };
    
    if (filter?.unreadOnly) {
      where.status = { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] };
    }
    
    if (filter?.type) {
      where.triggerEvent = filter.type;
    }

    const [data, total] = await Promise.all([
      this.db.notificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.notificationLog.count({ where }),
    ]);
    
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPending(tenantId: string, limit = 100) {
    return this.db.notificationLog.findMany({
      where: { 
        tenantId, 
        status: NotificationStatus.PENDING,
        createdAt: { lte: new Date() },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { priority: 'desc', createdAt: 'asc' },
      take: limit,
    });
  }

  async findPendingByChannel(tenantId: string, channel: NotificationChannel, limit = 50) {
    return this.db.notificationLog.findMany({
      where: { 
        tenantId, 
        channel,
        status: NotificationStatus.PENDING,
        createdAt: { lte: new Date() },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { priority: 'desc', createdAt: 'asc' },
      take: limit,
    });
  }

  async findFailed(tenantId: string, maxRetries = 3) {
    return this.db.notificationLog.findMany({
      where: {
        tenantId,
        status: NotificationStatus.FAILED,
        retryCount: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findExpired() {
    return this.db.notificationLog.findMany({
      where: {
        expiresAt: { lte: new Date() },
        status: { notIn: [NotificationStatus.EXPIRED, NotificationStatus.READ, NotificationStatus.SENT] },
      },
    });
  }

  async markAsExpired(id: string) {
    return this.db.notificationLog.update({
      where: { id },
      data: { status: NotificationStatus.EXPIRED },
    });
  }

  async markAsRead(id: string, tenantId: string) {
    return this.db.notificationLog.updateMany({
      where: { id, tenantId },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async markAsSent(id: string, sentAt?: Date) {
    return this.db.notificationLog.update({
      where: { id },
      data: { 
        status: NotificationStatus.SENT, 
        sentAt: sentAt || new Date(),
      },
    });
  }

  async markAsDelivered(id: string, deliveredAt?: Date) {
    return this.db.notificationLog.update({
      where: { id },
      data: { 
        status: NotificationStatus.DELIVERED, 
        deliveredAt: deliveredAt || new Date(),
      },
    });
  }

  async markAsFailed(id: string, errorMessage: string) {
    return this.db.notificationLog.update({
      where: { id },
      data: { 
        status: NotificationStatus.FAILED, 
        errorMessage,
      },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.db.notificationLog.updateMany({
      where: {
        tenantId,
        userId,
        status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] },
      },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.db.notificationLog.count({
      where: {
        tenantId,
        userId,
        status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] },
      },
    });
  }

  async countByStatus(tenantId: string, status: NotificationStatus): Promise<number> {
    return this.db.notificationLog.count({
      where: { tenantId, status },
    });
  }

  async findDigestCandidates(tenantId: string, userId: string, since?: Date) {
    const sinceDate = since || new Date();
    sinceDate.setHours(sinceDate.getHours() - 24);

    return this.db.notificationLog.findMany({
      where: {
        tenantId,
        userId,
        priority: NotificationPriority.LOW,
        status: NotificationStatus.PENDING,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByEvent(
    tenantId: string,
    userId: string,
    event: NotificationTriggerEvent,
    startDate: Date,
    endDate: Date,
  ) {
    return this.db.notificationLog.findMany({
      where: {
        tenantId,
        userId,
        triggerEvent: event,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    page = 1,
    limit = 50,
  ) {
    const [data, total] = await Promise.all([
      this.db.notificationLog.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.notificationLog.count({
        where: {
          tenantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deleteOldNotifications(tenantId: string, daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return this.db.notificationLog.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: cutoffDate },
        status: { in: [NotificationStatus.READ, NotificationStatus.EXPIRED] },
      },
    });
  }

  async deleteByUser(tenantId: string, userId?: string, olderThanDays?: number) {
    const where: any = { tenantId };
    
    if (userId) {
      where.userId = userId;
    }
    
    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      where.createdAt = { lt: cutoffDate };
    }
    
    return this.db.notificationLog.deleteMany({ where });
  }

  async getStats(tenantId: string, startDate: Date, endDate: Date) {
    const [total, sent, delivered, failed, read, pending] = await Promise.all([
      this.db.notificationLog.count({
        where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.db.notificationLog.count({
        where: { 
          tenantId, 
          createdAt: { gte: startDate, lte: endDate },
          status: NotificationStatus.SENT,
        },
      }),
      this.db.notificationLog.count({
        where: { 
          tenantId, 
          createdAt: { gte: startDate, lte: endDate },
          status: NotificationStatus.DELIVERED,
        },
      }),
      this.db.notificationLog.count({
        where: { 
          tenantId, 
          createdAt: { gte: startDate, lte: endDate },
          status: NotificationStatus.FAILED,
        },
      }),
      this.db.notificationLog.count({
        where: { 
          tenantId, 
          createdAt: { gte: startDate, lte: endDate },
          readAt: { not: null },
        },
      }),
      this.db.notificationLog.count({
        where: { 
          tenantId, 
          createdAt: { gte: startDate, lte: endDate },
          status: NotificationStatus.PENDING,
        },
      }),
    ]);

    return { 
      total, 
      sent, 
      delivered,
      failed, 
      read,
      pending,
      successRate: total > 0 ? ((sent + delivered) / total * 100).toFixed(2) : '0',
    };
  }

  async getStatsByChannel(
    tenantId: string, 
    startDate: Date, 
    endDate: Date,
  ) {
    const channels = Object.values(NotificationChannel);
    const results: Record<string, any> = {};

    for (const channel of channels) {
      const [total, sent, failed] = await Promise.all([
        this.db.notificationLog.count({
          where: {
            tenantId,
            channel,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.db.notificationLog.count({
          where: {
            tenantId,
            channel,
            createdAt: { gte: startDate, lte: endDate },
            status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
          },
        }),
        this.db.notificationLog.count({
          where: {
            tenantId,
            channel,
            createdAt: { gte: startDate, lte: endDate },
            status: NotificationStatus.FAILED,
          },
        }),
      ]);

      results[channel] = { total, sent, failed };
    }

    return results;
  }

  async getStatsByEvent(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 10,
  ) {
    const events = await this.db.notificationLog.groupBy({
      by: ['triggerEvent'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        triggerEvent: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    return events.map(event => ({
      event: event.triggerEvent,
      count: event._count.id,
    }));
  }

  async bulkCreate(notifications: CreateNotificationRecord[]) {
    return this.db.notificationLog.createMany({
      data: notifications.map(n => ({
        tenantId: n.tenantId,
        userId: n.userId,
        channel: n.channel,
        recipient: n.recipient,
        title: n.title,
        body: n.body,
        status: n.status,
        priority: n.priority,
        triggerEvent: n.triggerEvent,
        actions: n.actions ? (n.actions as any) : undefined,
        metadata: n.metadata || undefined,
        expiresAt: n.expiresAt,
      })),
    });
  }

  async getUnreadCountByPriority(tenantId: string, userId: string) {
    const [high, medium, low] = await Promise.all([
      this.db.notificationLog.count({
        where: {
          tenantId,
          userId,
          priority: NotificationPriority.HIGH,
          status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] },
        },
      }),
      this.db.notificationLog.count({
        where: {
          tenantId,
          userId,
          priority: NotificationPriority.MEDIUM,
          status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] },
        },
      }),
      this.db.notificationLog.count({
        where: {
          tenantId,
          userId,
          priority: NotificationPriority.LOW,
          status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] },
        },
      }),
    ]);

    return { high, medium, low, total: high + medium + low };
  }

  async findByExternalId(externalId: string) {
    return this.db.notificationLog.findFirst({
      where: { 
        metadata: {
          path: ['externalId'],
          equals: externalId,
        }
      },
    });
  }

  async getDispatchStats(tenantId: string, startDate: Date) {
    const endDate = new Date();
    return this.getStats(tenantId, startDate, endDate);
  }

  async updateMany(where: any, data: any) {
    return this.db.notificationLog.updateMany({
      where,
      data,
    });
  }
}