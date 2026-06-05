// src/websocket/services/websocket.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationsService } from '../../notifications/services/notification.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);

  constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendNotificationToUser(
    userId: string,
    tenantId: string,
    title: string,
    body: string,
    type: string,
    data?: any,
  ): Promise<void> {
    try {
      // Create notification in database
      const notification = await this.notificationsService.send({
        tenantId,
        userId,
        title,
        body,
        channel: 'IN_APP',
       // recipient: userId,
      });

      // Send real-time via WebSocket
      this.notificationGateway.sendToUser(userId, 'notification', {
        //id: notification.id,
        title,
        body,
        type,
        data,
        timestamp: new Date(),
      });

      this.logger.log(`WebSocket notification sent to user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send WebSocket notification: ${error.message}`);
    }
  }

  async broadcastToTenant(
    tenantId: string,
    title: string,
    body: string,
    type: string,
    data?: any,
  ): Promise<void> {
    this.notificationGateway.sendToTenant(tenantId, 'broadcast', {
      title,
      body,
      type,
      data,
      timestamp: new Date(),
    });
    this.logger.log(`Broadcast sent to tenant: ${tenantId}`);
  }

  async sendAttendanceAlert(
    userId: string,
    tenantId: string,
    type: string,
    data: any,
  ): Promise<void> {
    let title = '';
    let body = '';

    switch (type) {
      case 'late_in':
        title = '⚠️ Late Clock-In';
        body = `You clocked in ${data.lateMinutes} minutes late.`;
        break;
      case 'early_out':
        title = '⚠️ Early Clock-Out';
        body = `You clocked out ${data.earlyMinutes} minutes early.`;
        break;
      case 'missed_punch':
        title = '⚠️ Missed Punch';
        body = 'You forgot to clock out. Please fix your timecard.';
        break;
      case 'overtime':
        title = '📊 Overtime Alert';
        body = `You have worked ${data.overtimeHours} hours overtime this week.`;
        break;
      default:
        title = 'Attendance Alert';
        body = 'Please check your attendance record.';
    }

    await this.sendNotificationToUser(userId, tenantId, title, body, type, data);
  }

  async sendLeaveRequestUpdate(
    userId: string,
    tenantId: string,
    status: 'approved' | 'rejected' | 'pending',
    leaveData: any,
  ): Promise<void> {
    let title = '';
    let body = '';

    if (status === 'approved') {
      title = '✅ Leave Request Approved';
      body = `Your ${leaveData.leaveType} leave request has been approved.`;
    } else if (status === 'rejected') {
      title = '❌ Leave Request Rejected';
      body = `Your ${leaveData.leaveType} leave request has been rejected.`;
    } else {
      title = '📝 Leave Request Submitted';
      body = `Your ${leaveData.leaveType} leave request has been submitted for approval.`;
    }

    await this.sendNotificationToUser(userId, tenantId, title, body, 'leave_request', {
      status,
      ...leaveData,
    });
  }

  async sendShiftReminder(
    userId: string,
    tenantId: string,
    shiftData: any,
  ): Promise<void> {
    const title = '⏰ Shift Reminder';
    const body = `You have a shift tomorrow at ${shiftData.startTime}.`;

    await this.sendNotificationToUser(userId, tenantId, title, body, 'shift_reminder', shiftData);
  }

  async sendSystemAlert(
    userIds: string[],
    tenantId: string,
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error',
  ): Promise<void> {
    for (const userId of userIds) {
      await this.sendNotificationToUser(userId, tenantId, title, message, 'system_alert', {
        severity,
      });
    }
  }
}