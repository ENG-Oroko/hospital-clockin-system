// src/notifications/services/notification.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { DispatcherService } from './dispatcher.service';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTriggerEvent,
  NotificationPayload,
} from '../types/notification.types';

// ==================== DTOs ====================

export interface SendNotificationDto {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  triggerEvent: NotificationTriggerEvent;
  metadata?: Record<string, any>;
  actions?: Array<{ label: string; url: string }>;
}

export interface SimpleNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  channel?: 'email' | 'sms' | 'in_app';
}

export interface BulkNotificationDto {
  userIds: string[];
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export interface NotificationQuery {
  tenantId: string;
  userId?: string;
  page?: number;
  limit?: number;
  status?: string;
  channel?: NotificationChannel;
  startDate?: Date;
  endDate?: Date;
}

// ==================== Service ====================

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly dispatcherService: DispatcherService,
  ) {}

  // ==================== Core CRUD Operations ====================

  /**
   * Find notifications by user with pagination
   */
  async findByUser(
    tenantId: string,
    userId: string,
    page: number,
    limit: number,
    filters?: { unreadOnly?: boolean; type?: NotificationTriggerEvent }
  ) {
    return this.notificationRepository.findByUser(tenantId, userId, page, limit, filters);
  }

  /**
   * Find all notifications (with query)
   */
  async findAll(query: NotificationQuery) {
    return this.notificationRepository.findByUser(
      query.tenantId,
      query.userId || query.tenantId,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * Find notification by ID
   */
  async findById(id: string, tenantId: string) {
    const notification = await this.notificationRepository.findById(id, tenantId);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  /**
   * Find one notification (alias for findById)
   */
  async findOne(id: string, tenantId: string) {
    return this.findById(id, tenantId);
  }

  /**
   * Create a notification record
   */
  async create(data: any) {
    return this.notificationRepository.create({
      tenantId: data.tenantId,
      userId: data.userId,
      channel: data.channel,
      recipient: data.recipient || data.userId,
      title: data.title,
      body: data.body,
      status: NotificationStatus.PENDING,
      priority: data.priority || NotificationPriority.MEDIUM,
      triggerEvent: data.triggerEvent,
      actions: data.actions,
      metadata: data.metadata,
      expiresAt: data.expiresAt,
    });
  }

  // ==================== Read/Unread Operations ====================

  /**
   * Count unread notifications
   */
  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.notificationRepository.countUnread(tenantId, userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, tenantId: string) {
    await this.notificationRepository.markAsRead(id, tenantId);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const result = await this.notificationRepository.markAllAsRead(tenantId, userId);
    return result.count;
  }

  /**
   * Mark multiple notifications as read
   */
  async markBulkAsRead(tenantId: string, notificationIds: string[]): Promise<number> {
    let count = 0;
    for (const id of notificationIds) {
      await this.notificationRepository.markAsRead(id, tenantId);
      count++;
    }
    return count;
  }

  // ==================== Delete/Cleanup Operations ====================

  /**
   * Delete a notification
   */
  async delete(id: string, tenantId: string) {
    await this.notificationRepository.deleteByUser(tenantId, undefined, undefined);
  }

  /**
   * Clear all notifications for a user
   */
  async clearAll(tenantId: string, userId: string): Promise<number> {
    const result = await this.notificationRepository.deleteByUser(tenantId, userId);
    return result.count;
  }

  /**
   * Clean up old notifications
   */
  async cleanup(tenantId: string, daysOld: number): Promise<{ deletedCount: number }> {
    const result = await this.notificationRepository.deleteOldNotifications(tenantId, daysOld);
    return { deletedCount: result.count };
  }

  // ==================== Summary & Stats ====================

  /**
   * Get notification summary
   */
  async getSummary(tenantId: string, userId: string) {
    const unreadCount = await this.countUnread(tenantId, userId);
    const recent = await this.notificationRepository.findByUser(tenantId, userId, 1, 5);
    
    return {
      unreadCount,
      totalCount: recent.total,
      hasUnread: unreadCount > 0,
      recentNotifications: recent.data,
    };
  }

  /**
   * Get admin statistics
   */
  async getStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    return this.notificationRepository.getStats(tenantId, start, end);
  }

  // ==================== Send Operations ====================

  /**
   * Send notification immediately
   */
  async send(dto: SendNotificationDto): Promise<{ success: boolean; messageId?: string }> {
    const payload: NotificationPayload = {
      tenantId: dto.tenantId,
      userId: dto.userId,
      event: dto.triggerEvent,
      priority: dto.priority,
      channels: [dto.channel],
      recipient: dto.userId,
      data: dto.metadata || {},
      actions: dto.actions,
    };

    await this.dispatcherService.dispatch(payload);
    
    return {
      success: true,
      messageId: `notif_${Date.now()}`,
    };
  }

  /**
   * Send a simple notification with default settings
   */
  async sendSimple(tenantId: string, dto: SimpleNotificationDto): Promise<{ success: boolean; messageId: string }> {
    this.logger.log(`Sending simple notification to ${dto.userId}: ${dto.title}`);

    const priority = this.mapTypeToPriority(dto.type || 'info');
    const channel = this.mapChannel(dto.channel || 'in_app');

    const result = await this.send({
      tenantId,
      userId: dto.userId,
      title: dto.title,
      body: dto.message,
      channel,
      priority,
      triggerEvent: this.mapTypeToEvent(dto.type || 'info'),
      metadata: { type: dto.type },
    });

    return {
      success: result.success,
      messageId: result.messageId || `simple_${Date.now()}`,
    };
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulk(tenantId: string, dto: BulkNotificationDto): Promise<{ success: boolean; count: number }> {
    this.logger.log(`Sending bulk notification to ${dto.userIds.length} users: ${dto.title}`);

    const result = await this.broadcast(
      tenantId,
      dto.userIds,
      {
        title: dto.title,
        body: dto.message,
        channel: NotificationChannel.IN_APP,
        priority: this.mapTypeToPriority(dto.type || 'info'),
        triggerEvent: this.mapTypeToEvent(dto.type || 'info'),
      },
    );

    return { success: result.count > 0, count: result.count };
  }

  /**
   * Broadcast notification to multiple users
   */
  async broadcast(
    tenantId: string,
    userIds: string[],
    data: {
      title: string;
      body: string;
      channel: NotificationChannel;
      priority: NotificationPriority;
      triggerEvent?: NotificationTriggerEvent;
    }
  ): Promise<{ count: number }> {
    const notifications = userIds.map(userId => ({
      tenantId,
      userId,
      channel: data.channel,
      recipient: userId,
      title: data.title,
      body: data.body,
      status: NotificationStatus.PENDING,
      priority: data.priority,
      triggerEvent: data.triggerEvent,
      metadata: {},
    }));

    const result = await this.notificationRepository.bulkCreate(notifications);
    return { count: result.count };
  }

  /**
   * Send SMS
   */
  async sendSMS(tenantId: string, userId: string, phoneNumber: string, message: string) {
    const payload: NotificationPayload = {
      tenantId,
      userId,
      event: NotificationTriggerEvent.CLOCK_IN_REMINDER,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.SMS],
      recipient: phoneNumber,
      data: { message, phoneNumber },
    };

    await this.dispatcherService.dispatch(payload);
    
    return { success: true, message: 'SMS sent successfully' };
  }

  /**
   * Send email
   */
  async sendEmail(tenantId: string, userId: string, email: string, subject: string, body: string) {
    const payload: NotificationPayload = {
      tenantId,
      userId,
      event: NotificationTriggerEvent.SCHEDULE_POSTED,
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.EMAIL],
      recipient: email,
      data: { subject, body, email },
    };

    await this.dispatcherService.dispatch(payload);
    
    return { success: true, message: 'Email sent successfully' };
  }

  /**
   * Send attendance notification
   */
  async sendAttendanceNotification(tenantId: string, userId: string, data: any) {
    const event = data.direction === 'in' 
      ? NotificationTriggerEvent.CLOCK_IN 
      : NotificationTriggerEvent.CLOCK_OUT;
    
    const payload: NotificationPayload = {
      tenantId,
      userId,
      event,
      priority: NotificationPriority.LOW,
      channels: [NotificationChannel.IN_APP],
      recipient: userId,
      data,
    };

    await this.dispatcherService.dispatch(payload);
    
    return { success: true, message: 'Attendance notification sent' };
  }

  /**
   * Retry failed notification
   */
  async retryFailed(tenantId: string, id: string) {
    const notification = await this.findById(id, tenantId);
    
    const payload: NotificationPayload = {
      tenantId: notification.tenantId,
      userId: notification.userId,
      event: notification.triggerEvent as NotificationTriggerEvent,
      priority: notification.priority as NotificationPriority,
      channels: [notification.channel as NotificationChannel],
      recipient: notification.recipient,
      data: notification.metadata as Record<string, any>,
    };

    await this.dispatcherService.dispatch(payload);
    
    return { success: true, message: 'Retry initiated' };
  }

  // ==================== Specialized Notifications ====================

  /**
   * Send a welcome notification to new user
   */
  async sendWelcome(tenantId: string, userId: string, userName: string, email: string): Promise<void> {
    this.logger.log(`Sending welcome notification to ${userId}`);

    await this.send({
      tenantId,
      userId,
      title: 'Welcome to H-Clock System! 🎉',
      body: `Hello ${userName}, welcome to the H-Clock attendance system. Please complete your profile setup.`,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      triggerEvent: NotificationTriggerEvent.SCHEDULE_POSTED,
      metadata: { userName, email, type: 'welcome' },
      actions: [
        { label: 'Complete Profile', url: '/profile/setup' },
        { label: 'View Guide', url: '/help/getting-started' },
      ],
    });
  }

  /**
   * Send password reset notification
   */
  async sendPasswordReset(
    tenantId: string,
    userId: string,
    email: string,
    resetToken: string,
  ): Promise<void> {
    this.logger.log(`Sending password reset to ${userId}`);

    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`;

    await this.send({
      tenantId,
      userId,
      title: 'Password Reset Request',
      body: `You requested to reset your password. Click the link below to reset it. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.HIGH,
      triggerEvent: NotificationTriggerEvent.INTEGRATION_FAILED,
      metadata: { resetToken, email, type: 'password_reset' },
      actions: [{ label: 'Reset Password', url: resetUrl }],
    });
  }

  /**
   * Send leave request status update
   */
  async sendLeaveStatus(
    tenantId: string,
    userId: string,
    employeeName: string,
    leaveType: string,
    startDate: Date,
    endDate: Date,
    status: 'approved' | 'rejected',
    approverName?: string,
  ): Promise<void> {
    this.logger.log(`Sending leave ${status} notification to ${userId}`);

    const event = status === 'approved'
      ? NotificationTriggerEvent.LEAVE_REQUEST_APPROVED
      : NotificationTriggerEvent.LEAVE_REQUEST_REJECTED;

    const title = status === 'approved' ? '✅ Leave Request Approved' : '❌ Leave Request Rejected';
    
    const body = status === 'approved'
      ? `Dear ${employeeName}, your ${leaveType} leave request from ${this.formatDate(startDate)} to ${this.formatDate(endDate)} has been approved by ${approverName || 'your manager'}.`
      : `Dear ${employeeName}, your ${leaveType} leave request from ${this.formatDate(startDate)} to ${this.formatDate(endDate)} has been rejected. Please contact your manager for more information.`;

    await this.send({
      tenantId,
      userId,
      title,
      body,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      triggerEvent: event,
      metadata: { employeeName, leaveType, startDate, endDate, status, approverName },
      actions: [
        { label: 'View Leave Details', url: '/leave/requests' },
        { label: 'Contact Manager', url: '/team' },
      ],
    });
  }

  /**
   * Send shift reminder
   */
  async sendShiftReminder(
    tenantId: string,
    userId: string,
    userName: string,
    shiftDate: Date,
    shiftStart: string,
    shiftEnd: string,
  ): Promise<void> {
    this.logger.log(`Sending shift reminder to ${userId}`);

    await this.send({
      tenantId,
      userId,
      title: '⏰ Shift Reminder',
      body: `Hello ${userName}, you have a shift tomorrow (${this.formatDate(shiftDate)}) from ${shiftStart} to ${shiftEnd}. Please don't forget to clock in on time.`,
      channel: NotificationChannel.SMS,
      priority: NotificationPriority.MEDIUM,
      triggerEvent: NotificationTriggerEvent.CLOCK_IN_REMINDER,
      metadata: { userName, shiftDate, shiftStart, shiftEnd },
      actions: [
        { label: 'View Schedule', url: '/roster' },
        { label: 'Set Reminder', url: '/settings/notifications' },
      ],
    });
  }

  /**
   * Send overtime alert
   */
  async sendOvertimeAlert(
    tenantId: string,
    userId: string,
    userName: string,
    overtimeHours: number,
    totalHours: number,
  ): Promise<void> {
    this.logger.log(`Sending overtime alert to ${userId}: ${overtimeHours} hours`);

    await this.send({
      tenantId,
      userId,
      title: '⚠️ Overtime Alert',
      body: `Hello ${userName}, you have accumulated ${overtimeHours} hours of overtime this week (Total: ${totalHours} hours). Please review your timecard.`,
      channel: NotificationChannel.IN_APP,
      priority: NotificationPriority.HIGH,
      triggerEvent: NotificationTriggerEvent.OVERTIME_APPROACHING,
      metadata: { userName, overtimeHours, totalHours },
      actions: [
        { label: 'View Timecard', url: '/attendance/timecard' },
        { label: 'Request Approval', url: '/attendance/overtime-request' },
      ],
    });
  }

  /**
   * Send system maintenance notification
   */
  async sendMaintenanceAlert(
    tenantId: string,
    userIds: string[],
    startTime: Date,
    endTime: Date,
    reason: string,
  ): Promise<void> {
    this.logger.log(`Sending maintenance alert to ${userIds.length} users`);

    await this.sendBulk(tenantId, {
      userIds,
      title: '🔧 System Maintenance',
      message: `The system will be under maintenance on ${this.formatDateTime(startTime)} until ${this.formatDateTime(endTime)}. Reason: ${reason}. Please save your work before this time.`,
      type: 'warning',
    });
  }

  // ==================== Webhooks ====================

  /**
   * Handle email webhook
   */
  async handleEmailWebhook(body: any): Promise<void> {
    this.logger.log('Email webhook received', body);
    // Implement based on your email provider (SendGrid, SES, etc.)
  }

  /**
   * Handle SMS webhook
   */
  async handleSmsWebhook(body: any): Promise<void> {
    this.logger.log('SMS webhook received', body);
    // Implement based on your SMS provider (Twilio, etc.)
  }

  // ==================== Private Helper Methods ====================

  private mapTypeToPriority(type: string): NotificationPriority {
    switch (type) {
      case 'error':
        return NotificationPriority.HIGH;
      case 'warning':
        return NotificationPriority.MEDIUM;
      case 'success':
      case 'info':
      default:
        return NotificationPriority.LOW;
    }
  }

  private mapChannel(channel: string): NotificationChannel {
    switch (channel) {
      case 'email':
        return NotificationChannel.EMAIL;
      case 'sms':
        return NotificationChannel.SMS;
      case 'in_app':
      default:
        return NotificationChannel.IN_APP;
    }
  }

  private mapTypeToEvent(type: string): NotificationTriggerEvent {
    switch (type) {
      case 'error':
        return NotificationTriggerEvent.INTEGRATION_FAILED;
      case 'warning':
        return NotificationTriggerEvent.OVERTIME_APPROACHING;
      case 'success':
        return NotificationTriggerEvent.LEAVE_REQUEST_APPROVED;
      case 'info':
      default:
        return NotificationTriggerEvent.SCHEDULE_POSTED;
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}