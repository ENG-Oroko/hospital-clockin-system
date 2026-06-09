import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  NotificationChannel, NotificationPriority,
  NotificationStatus, NotificationTriggerEvent, NotificationAction,
} from '../types/notification.types';

export interface CreateNotificationRecord {
  tenantId: string; userId: string; channel: NotificationChannel; recipient: string;
  title: string; body: string; status: NotificationStatus; priority: NotificationPriority;
  triggerEvent?: NotificationTriggerEvent; actions?: NotificationAction[];
  expiresAt?: Date; metadata?: Record<string, any>;
}

// FIXED: DatabaseService → PrismaService throughout
// ADDED: getDistinctTenants(), createDigest(), updateDigestStatus() — called by retry-failed.job.ts and send-notification.job.ts

@Injectable()
export class NotificationRepository {
  constructor(private readonly db: PrismaService) {}

  async create(data: CreateNotificationRecord) {
    return this.db.notificationLog.create({
      data: {
        tenantId: data.tenantId, userId: data.userId, channel: data.channel,
        recipient: data.recipient, title: data.title, body: data.body,
        status: data.status, priority: data.priority, triggerEvent: data.triggerEvent,
        actions: data.actions ? (data.actions as any) : undefined,
        metadata: data.metadata || undefined, expiresAt: data.expiresAt,
      },
    });
  }

  async updateStatus(id: string, status: NotificationStatus, extra?: { readAt?: Date; sentAt?: Date; deliveredAt?: Date; errorMessage?: string }) {
    return this.db.notificationLog.update({ where: { id }, data: { status, ...extra } });
  }

  async update(id: string, data: any) {
    return this.db.notificationLog.update({ where: { id }, data });
  }

  async incrementRetry(id: string, errorMessage?: string) {
    return this.db.notificationLog.update({ where: { id }, data: { retryCount: { increment: 1 }, errorMessage } });
  }

  async findById(id: string, tenantId: string) {
    return this.db.notificationLog.findFirst({ where: { id, tenantId } });
  }

  async findByUser(tenantId: string, userId: string, page = 1, limit = 20, filter?: { unreadOnly?: boolean; type?: NotificationTriggerEvent }) {
    const where: any = { tenantId, userId };
    if (filter?.unreadOnly) where.status = { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] };
    if (filter?.type) where.triggerEvent = filter.type;
    const [data, total] = await Promise.all([
      this.db.notificationLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.db.notificationLog.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPending(tenantId: string, limit = 100) {
    return this.db.notificationLog.findMany({
      where: { tenantId, status: NotificationStatus.PENDING, createdAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }], take: limit,
    });
  }

  async findFailed(tenantId: string, maxRetries = 3) {
    return this.db.notificationLog.findMany({
      where: { tenantId, status: NotificationStatus.FAILED, retryCount: { lt: maxRetries } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findExpired() {
    return this.db.notificationLog.findMany({
      where: { expiresAt: { lte: new Date() }, status: { notIn: [NotificationStatus.EXPIRED, NotificationStatus.READ, NotificationStatus.SENT] } },
    });
  }

  async markAsExpired(id: string) {
    return this.db.notificationLog.update({ where: { id }, data: { status: NotificationStatus.EXPIRED } });
  }

  async markAsRead(id: string, tenantId: string) {
    return this.db.notificationLog.updateMany({ where: { id, tenantId }, data: { status: NotificationStatus.READ, readAt: new Date() } });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.db.notificationLog.updateMany({
      where: { tenantId, userId, status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] } },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.db.notificationLog.count({
      where: { tenantId, userId, status: { in: [NotificationStatus.SENT, NotificationStatus.DELIVERED, NotificationStatus.PENDING] } },
    });
  }

  async findDigestCandidates(tenantId: string, userId: string, since?: Date) {
    const sinceDate = since || new Date(); sinceDate.setHours(sinceDate.getHours() - 24);
    return this.db.notificationLog.findMany({
      where: { tenantId, userId, priority: NotificationPriority.LOW, status: NotificationStatus.PENDING, createdAt: { gte: sinceDate } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteOldNotifications(tenantId: string, daysOld = 90) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysOld);
    return this.db.notificationLog.deleteMany({
      where: { tenantId, createdAt: { lt: cutoff }, status: { in: [NotificationStatus.READ, NotificationStatus.EXPIRED] } },
    });
  }

  async deleteByUser(tenantId: string, userId?: string, olderThanDays?: number) {
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (olderThanDays) { const d = new Date(); d.setDate(d.getDate() - olderThanDays); where.createdAt = { lt: d }; }
    return this.db.notificationLog.deleteMany({ where });
  }

  async getStats(tenantId: string, startDate: Date, endDate: Date) {
    const [total, sent, delivered, failed, read, pending] = await Promise.all([
      this.db.notificationLog.count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate } } }),
      this.db.notificationLog.count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, status: NotificationStatus.SENT } }),
      this.db.notificationLog.count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, status: NotificationStatus.DELIVERED } }),
      this.db.notificationLog.count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, status: NotificationStatus.FAILED } }),
      this.db.notificationLog.count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, readAt: { not: null } } }),
      this.db.notificationLog.count({ where: { tenantId, createdAt: { gte: startDate, lte: endDate }, status: NotificationStatus.PENDING } }),
    ]);
    return { total, sent, delivered, failed, read, pending, successRate: total > 0 ? (((sent + delivered) / total) * 100).toFixed(2) : '0' };
  }

  async bulkCreate(notifications: CreateNotificationRecord[]) {
    return this.db.notificationLog.createMany({
      data: notifications.map(n => ({ tenantId: n.tenantId, userId: n.userId, channel: n.channel, recipient: n.recipient, title: n.title, body: n.body, status: n.status, priority: n.priority, triggerEvent: n.triggerEvent, actions: n.actions ? (n.actions as any) : undefined, metadata: n.metadata || undefined, expiresAt: n.expiresAt })),
    });
  }

  async updateMany(where: any, data: any) {
    return this.db.notificationLog.updateMany({ where, data });
  }

  // ─── Methods required by retry-failed.job.ts and send-notification.job.ts ──

  /**
   * Returns the distinct tenant IDs that have notifications in the log.
   * Used by the retry job to iterate over all tenants.
   */
  async getDistinctTenants(): Promise<string[]> {
    const rows = await this.db.notificationLog.groupBy({
      by: ['tenantId'],
    });
    return rows.map(r => r.tenantId);
  }

  /**
   * Creates a digest record. Stored as a regular notificationLog entry with
   * channel=EMAIL and a metadata flag so it can be identified as a digest.
   */
  async createDigest(data: {
    tenantId: string; userId: string; type: string;
    title: string; body: string; items: any[]; status: string;
  }) {
    return this.db.notificationLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        channel: NotificationChannel.EMAIL,
        recipient: data.userId,
        title: data.title,
        body: data.body,
        status: data.status === 'pending' ? NotificationStatus.PENDING : NotificationStatus.SENT,
        priority: NotificationPriority.LOW,
        metadata: { isDigest: true, digestType: data.type, items: data.items },
      },
    });
  }

  /**
   * Updates a digest record status. Reuses updateStatus internally.
   */
  async updateDigestStatus(id: string, status: 'sent' | 'failed', messageIdOrError?: string): Promise<void> {
    const notifStatus = status === 'sent' ? NotificationStatus.SENT : NotificationStatus.FAILED;
    await this.db.notificationLog.update({
      where: { id },
      data: {
        status: notifStatus,
        ...(status === 'sent'   ? { sentAt: new Date(), metadata: { messageId: messageIdOrError } } : {}),
        ...(status === 'failed' ? { errorMessage: messageIdOrError } : {}),
      },
    });
  }
}