// listeners/notification.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DispatcherService } from '../services/dispatcher.service';
import { LateInRule, ClockInEventData } from '../rules/late-in.rule';
import { MissedPunchRule } from '../rules/missed-punch.rule';
import { WebSocketService } from '../../websocket/services/websocket.service';
import { OvertimeRule } from '../rules/overtime.rule';
import {
  NotificationTriggerEvent,
  NotificationPriority,
  NotificationChannel,
} from '../types/notification.types';

export interface ClockInEvent {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
  attendanceRecordId: string;
  shiftId: string;
  shiftDate: Date;
  scheduledStartTime: string;
  actualClockInTime: Date;
  scheduledEndTime: string;
  department: string;
  departmentId: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  companyId: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface ClockOutEvent {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  attendanceRecordId: string;
  shiftId: string;
  shiftDate: Date;
  scheduledEndTime: string;
  actualClockOutTime: Date;
  scheduledStartTime: string;
  totalWorkHours: number;
  department: string;
  managerId: string;
}

export interface LeaveRequestEvent {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leaveRequestId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  reason?: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
}

export interface TimecardEditEvent {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  attendanceRecordId: string;
  shiftDate: Date;
  editedBy: string;
  editedByName: string;
  changes: Record<string, { old: any; new: any }>;
  department: string;
  managerId: string;
}

export interface ShiftAssignmentEvent {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  shiftId: string;
  shiftDate: Date;
  shiftStart: string;
  shiftEnd: string;
  department: string;
  assignedBy: string;
  assignedByName: string;
}

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly dispatcherService: DispatcherService,
    private readonly lateInRule: LateInRule,
    private readonly missedPunchRule: MissedPunchRule,
    private readonly overtimeRule: OvertimeRule,
    private readonly webSocketService: WebSocketService,
  ) {}

  // ==================== Attendance Events ====================

  /**
   * Listen to clock-in events and trigger late notifications if applicable
   */
  @OnEvent('attendance.clock-in.completed')
  async handleClockIn(event: ClockInEvent) {
    this.logger.debug(`Received clock-in event for user: ${event.userId}`);
    
    try {
      const result = await this.lateInRule.evaluate(event);
      
      if (result.shouldNotify && result.payload) {
        // Dispatch notification through regular channels
        await this.dispatcherService.dispatch(result.payload);
        this.logger.log(`Late notification dispatched for user: ${event.userId}, late: ${result.lateMinutes}min`);
        
        // Send real-time WebSocket notification
        await this.webSocketService.sendAttendanceAlert(
          event.userId,
          event.tenantId,
          'late_in',
          {
            lateMinutes: result.lateMinutes,
            shiftStart: event.scheduledStartTime,
            actualClockIn: event.actualClockInTime,
            shiftDate: event.shiftDate,
          },
        );
        
        // Notify manager for significant lateness
        if (result.lateMinutes > 30) {
          await this.webSocketService.sendNotificationToUser(
            event.managerId,
            event.tenantId,
            '⚠️ Employee Late Alert',
            `${event.employeeName} is ${result.lateMinutes} minutes late for their shift starting at ${event.scheduledStartTime}.`,
            'manager_alert',
            {
              employeeId: event.userId,
              employeeName: event.employeeName,
              lateMinutes: result.lateMinutes,
              shiftStart: event.scheduledStartTime,
              shiftDate: event.shiftDate,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process clock-in notification: ${error.message}`);
    }
  }

  /**
   * Listen to clock-out events and check for missed punches
   */
  @OnEvent('attendance.clock-out.completed')
  async handleClockOut(event: ClockOutEvent) {
    this.logger.debug(`Received clock-out event for user: ${event.userId}`);
    
    try {
      // Check for overtime
      const overtimeResult = await this.overtimeRule.evaluate(event);
      
      if (overtimeResult.shouldNotify && overtimeResult.payload) {
        await this.dispatcherService.dispatch(overtimeResult.payload);
        this.logger.log(`Overtime notification dispatched for user: ${event.userId}`);
        
        // Send real-time WebSocket notification for overtime
        if (overtimeResult.overtimeHours > 0) {
          await this.webSocketService.sendAttendanceAlert(
            event.userId,
            event.tenantId,
            'overtime',
            {
              overtimeHours: overtimeResult.overtimeHours,
              totalHours: event.totalWorkHours,
              shiftDate: event.shiftDate,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process clock-out notification: ${error.message}`);
    }
  }

  /**
   * Scheduled check for missed punches (runs via cron job)
   */
  @OnEvent('attendance.missed-punch.check')
  async handleMissedPunchCheck(data: { tenantId: string; userId: string; attendanceRecord: any }) {
    this.logger.debug(`Checking missed punch for user: ${data.userId}`);
    
    try {
      const result = await this.missedPunchRule.evaluate(data);
      
      if (result.shouldNotify && result.payload) {
        await this.dispatcherService.dispatch(result.payload);
        this.logger.log(`Missed punch notification dispatched for user: ${data.userId}`);
        
        // Send urgent WebSocket notification for missed punch
        await this.webSocketService.sendAttendanceAlert(
          data.userId,
          data.tenantId,
          'missed_punch',
          {
            shiftDate: data.attendanceRecord?.shiftDate,
            clockInTime: data.attendanceRecord?.clockInTime,
            missedHours: result.missedHours,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to process missed punch notification: ${error.message}`);
    }
  }

  // ==================== Leave Request Events ====================

  /**
   * Listen to leave request creation events
   */
  @OnEvent('leave.request.created')
  async handleLeaveRequestCreated(event: LeaveRequestEvent) {
    this.logger.debug(`Leave request created for user: ${event.userId}`);
    
    try {
      const payload = {
        tenantId: event.tenantId,
        userId: event.managerId,
        event: NotificationTriggerEvent.LEAVE_REQUEST_CREATED,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: event.managerEmail,
        data: {
          employeeName: event.employeeName,
          leaveType: event.leaveType,
          startDate: event.startDate,
          endDate: event.endDate,
          durationDays: event.durationDays,
          reason: event.reason,
          leaveRequestId: event.leaveRequestId,
          approveUrl: `/leave/requests/${event.leaveRequestId}/approve`,
          rejectUrl: `/leave/requests/${event.leaveRequestId}/reject`,
        },
        actions: [
          { label: 'Approve', url: `/leave/requests/${event.leaveRequestId}/approve` },
          { label: 'Reject', url: `/leave/requests/${event.leaveRequestId}/reject` },
          { label: 'View Details', url: `/leave/requests/${event.leaveRequestId}` },
        ],
        expiresInMinutes: 10080,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket notification to manager
      await this.webSocketService.sendNotificationToUser(
        event.managerId,
        event.tenantId,
        '📝 New Leave Request',
        `${event.employeeName} has submitted a ${event.leaveType} leave request from ${event.startDate} to ${event.endDate}.`,
        'leave_request',
        {
          requestId: event.leaveRequestId,
          employeeName: event.employeeName,
          leaveType: event.leaveType,
          startDate: event.startDate,
          endDate: event.endDate,
          durationDays: event.durationDays,
        },
      );
      
      this.logger.log(`Leave request notification sent to manager: ${event.managerId}`);
    } catch (error) {
      this.logger.error(`Failed to process leave request notification: ${error.message}`);
    }
  }

  /**
   * Listen to leave request approval events
   */
  @OnEvent('leave.request.approved')
  async handleLeaveRequestApproved(event: LeaveRequestEvent) {
    this.logger.debug(`Leave request approved for user: ${event.userId}`);
    
    try {
      const payload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.LEAVE_REQUEST_APPROVED,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipient: event.employeeEmail,
        data: {
          employeeName: event.employeeName,
          leaveType: event.leaveType,
          startDate: event.startDate,
          endDate: event.endDate,
          durationDays: event.durationDays,
          approvedBy: event.managerName,
          leaveRequestId: event.leaveRequestId,
          viewUrl: `/leave/requests/${event.leaveRequestId}`,
        },
        actions: [
          { label: 'View Leave Details', url: `/leave/requests/${event.leaveRequestId}` },
          { label: 'Add to Calendar', url: `/leave/requests/${event.leaveRequestId}/calendar` },
        ],
        expiresInMinutes: 10080,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket notification to employee
      await this.webSocketService.sendLeaveRequestUpdate(
        event.userId,
        event.tenantId,
        'approved',
        {
          leaveType: event.leaveType,
          startDate: event.startDate,
          endDate: event.endDate,
          durationDays: event.durationDays,
          approvedBy: event.managerName,
        },
      );
      
      this.logger.log(`Leave approval notification sent to employee: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process leave approval notification: ${error.message}`);
    }
  }

  /**
   * Listen to leave request rejection events
   */
  @OnEvent('leave.request.rejected')
  async handleLeaveRequestRejected(event: LeaveRequestEvent & { rejectionReason?: string }) {
    this.logger.debug(`Leave request rejected for user: ${event.userId}`);
    
    try {
      const payload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.LEAVE_REQUEST_REJECTED,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: event.employeeEmail,
        data: {
          employeeName: event.employeeName,
          leaveType: event.leaveType,
          startDate: event.startDate,
          endDate: event.endDate,
          rejectionReason: event.rejectionReason,
          rejectedBy: event.managerName,
          leaveRequestId: event.leaveRequestId,
          contactUrl: `/leave/contact/${event.managerId}`,
        },
        actions: [
          { label: 'Contact Manager', url: `/leave/contact/${event.managerId}` },
          { label: 'View Details', url: `/leave/requests/${event.leaveRequestId}` },
        ],
        expiresInMinutes: 4320,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket notification to employee
      await this.webSocketService.sendLeaveRequestUpdate(
        event.userId,
        event.tenantId,
        'rejected',
        {
          leaveType: event.leaveType,
          startDate: event.startDate,
          endDate: event.endDate,
          durationDays: event.durationDays,
          rejectionReason: event.rejectionReason,
          rejectedBy: event.managerName,
        },
      );
      
      this.logger.log(`Leave rejection notification sent to employee: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process leave rejection notification: ${error.message}`);
    }
  }

  // ==================== Timecard Events ====================

  /**
   * Listen to timecard edit events
   */
  @OnEvent('timecard.edited')
  async handleTimecardEdited(event: TimecardEditEvent) {
    this.logger.debug(`Timecard edited for user: ${event.userId} by ${event.editedByName}`);
    
    try {
      const changeSummary = Object.entries(event.changes)
        .map(([field, { old, new: newVal }]) => `${field}: ${old} → ${newVal}`)
        .join(', ');
      
      const payload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.TIMECARD_EDITED,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipient: event.employeeEmail,
        data: {
          employeeName: event.employeeName,
          shiftDate: event.shiftDate,
          editedBy: event.editedByName,
          changes: event.changes,
          changeSummary,
          attendanceRecordId: event.attendanceRecordId,
          viewUrl: `/attendance/records/${event.attendanceRecordId}`,
          disputeUrl: `/attendance/records/${event.attendanceRecordId}/dispute`,
        },
        actions: [
          { label: 'View Changes', url: `/attendance/records/${event.attendanceRecordId}` },
          { label: 'Dispute', url: `/attendance/records/${event.attendanceRecordId}/dispute` },
        ],
        expiresInMinutes: 1440,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket notification
      await this.webSocketService.sendNotificationToUser(
        event.userId,
        event.tenantId,
        '✏️ Timecard Edited',
        `Your timecard for ${event.shiftDate} was modified by ${event.editedByName}. Changes: ${changeSummary}`,
        'timecard_edit',
        {
          shiftDate: event.shiftDate,
          editedBy: event.editedByName,
          changes: event.changes,
          attendanceRecordId: event.attendanceRecordId,
        },
      );
      
      this.logger.log(`Timecard edit notification sent to employee: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process timecard edit notification: ${error.message}`);
    }
  }

  // ==================== Shift Events ====================

  /**
   * Listen to shift assignment events
   */
  @OnEvent('shift.assigned')
  async handleShiftAssigned(event: ShiftAssignmentEvent) {
    this.logger.debug(`Shift assigned to user: ${event.userId}`);
    
    try {
      const payload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.SHIFT_ASSIGNED,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipient: event.employeeEmail,
        data: {
          employeeName: event.employeeName,
          shiftDate: event.shiftDate,
          shiftStart: event.shiftStart,
          shiftEnd: event.shiftEnd,
          assignedBy: event.assignedByName,
          shiftId: event.shiftId,
          viewUrl: `/roster/shifts/${event.shiftId}`,
          confirmUrl: `/roster/shifts/${event.shiftId}/confirm`,
          declineUrl: `/roster/shifts/${event.shiftId}/decline`,
        },
        actions: [
          { label: 'Accept Shift', url: `/roster/shifts/${event.shiftId}/confirm` },
          { label: 'Decline', url: `/roster/shifts/${event.shiftId}/decline` },
          { label: 'View Roster', url: `/roster` },
        ],
        expiresInMinutes: 1440,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket notification
      await this.webSocketService.sendShiftReminder(
        event.userId,
        event.tenantId,
        {
          startTime: event.shiftStart,
          endTime: event.shiftEnd,
          date: event.shiftDate,
          shiftId: event.shiftId,
        },
      );
      
      this.logger.log(`Shift assignment notification sent to employee: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process shift assignment notification: ${error.message}`);
    }
  }

  /**
   * Listen to shift change events
   */
  @OnEvent('shift.changed')
  async handleShiftChanged(event: ShiftAssignmentEvent & { oldShiftStart: string; oldShiftEnd: string }) {
    this.logger.debug(`Shift changed for user: ${event.userId}`);
    
    try {
      const payload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.SHIFT_CHANGED,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipient: event.employeeEmail,
        data: {
          employeeName: event.employeeName,
          shiftDate: event.shiftDate,
          oldShiftStart: event.oldShiftStart,
          oldShiftEnd: event.oldShiftEnd,
          newShiftStart: event.shiftStart,
          newShiftEnd: event.shiftEnd,
          changedBy: event.assignedByName,
          shiftId: event.shiftId,
          viewUrl: `/roster/shifts/${event.shiftId}`,
          acceptUrl: `/roster/shifts/${event.shiftId}/accept-change`,
        },
        actions: [
          { label: 'View Changes', url: `/roster/shifts/${event.shiftId}` },
          { label: 'Confirm', url: `/roster/shifts/${event.shiftId}/accept-change` },
        ],
        expiresInMinutes: 720,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket notification
      await this.webSocketService.sendNotificationToUser(
        event.userId,
        event.tenantId,
        '🔄 Shift Changed',
        `Your shift on ${event.shiftDate} has been changed from ${event.oldShiftStart}-${event.oldShiftEnd} to ${event.shiftStart}-${event.shiftEnd}.`,
        'shift_change',
        {
          shiftDate: event.shiftDate,
          oldShiftStart: event.oldShiftStart,
          oldShiftEnd: event.oldShiftEnd,
          newShiftStart: event.shiftStart,
          newShiftEnd: event.shiftEnd,
          changedBy: event.assignedByName,
          shiftId: event.shiftId,
        },
      );
      
      this.logger.log(`Shift change notification sent to employee: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process shift change notification: ${error.message}`);
    }
  }

  // ==================== Schedule Events ====================

  /**
   * Listen to schedule posted events
   */
  @OnEvent('schedule.posted')
  async handleSchedulePosted(data: { tenantId: string; userIds: string[]; weekStart: Date; postedBy: string }) {
    this.logger.debug(`Schedule posted for ${data.userIds.length} users`);
    
    try {
      const payloads = data.userIds.map(userId => ({
        tenantId: data.tenantId,
        userId,
        event: NotificationTriggerEvent.SCHEDULE_POSTED,
        priority: NotificationPriority.LOW,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: userId,
        data: {
          weekStart: data.weekStart,
          postedBy: data.postedBy,
          viewUrl: `/roster/schedule`,
        },
        actions: [
          { label: 'View Schedule', url: `/roster/schedule` },
        ],
        expiresInMinutes: 10080,
      }));
      
      await this.dispatcherService.bulkDispatch(payloads);
      
      // Send WebSocket broadcast to all affected users
      for (const userId of data.userIds) {
        await this.webSocketService.sendNotificationToUser(
          userId,
          data.tenantId,
          '📅 New Schedule Posted',
          `A new schedule has been posted for the week of ${data.weekStart}.`,
          'schedule_update',
          {
            weekStart: data.weekStart,
            postedBy: data.postedBy,
          },
        );
      }
      
      this.logger.log(`Schedule posted notifications sent to ${data.userIds.length} employees`);
    } catch (error) {
      this.logger.error(`Failed to process schedule posted notification: ${error.message}`);
    }
  }

  // ==================== Reminder Events ====================

  /**
   * Listen to clock-in reminder events (triggered by cron)
   */
  @OnEvent('reminder.clock-in')
  async handleClockInReminder(data: { tenantId: string; userId: string; employeeName: string; employeeEmail: string; scheduledStartTime: string }) {
    this.logger.debug(`Clock-in reminder for user: ${data.userId}`);
    
    try {
      const payload = {
        tenantId: data.tenantId,
        userId: data.userId,
        event: NotificationTriggerEvent.CLOCK_IN_REMINDER,
        priority: NotificationPriority.LOW,
        channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
        recipient: data.employeeEmail,
        data: {
          employeeName: data.employeeName,
          scheduledStartTime: data.scheduledStartTime,
          clockInUrl: `/attendance/clock-in`,
        },
        actions: [
          { label: 'Clock In Now', url: `/attendance/clock-in` },
        ],
        expiresInMinutes: 60,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket reminder
      await this.webSocketService.sendNotificationToUser(
        data.userId,
        data.tenantId,
        '⏰ Clock-In Reminder',
        `Your shift starts at ${data.scheduledStartTime}. Please don't forget to clock in.`,
        'reminder',
        {
          scheduledStartTime: data.scheduledStartTime,
          clockInUrl: `/attendance/clock-in`,
        },
      );
      
      this.logger.log(`Clock-in reminder sent to: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process clock-in reminder: ${error.message}`);
    }
  }

  /**
   * Listen to unsubmitted timesheet reminder
   */
  @OnEvent('reminder.unsubmitted-timesheet')
  async handleUnsubmittedTimesheet(data: { tenantId: string; userId: string; employeeName: string; employeeEmail: string; periodEnd: Date }) {
    this.logger.debug(`Unsubmitted timesheet reminder for user: ${data.userId}`);
    
    try {
      const payload = {
        tenantId: data.tenantId,
        userId: data.userId,
        event: NotificationTriggerEvent.UNSUBMITTED_TIMESHEET,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: data.employeeEmail,
        data: {
          employeeName: data.employeeName,
          periodEnd: data.periodEnd,
          submitUrl: `/attendance/timesheet/submit`,
        },
        actions: [
          { label: 'Submit Timesheet', url: `/attendance/timesheet/submit` },
        ],
        expiresInMinutes: 2880,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket reminder
      await this.webSocketService.sendNotificationToUser(
        data.userId,
        data.tenantId,
        '📋 Unsubmitted Timesheet',
        `Your timesheet for the period ending ${data.periodEnd} has not been submitted. Please submit it as soon as possible.`,
        'reminder',
        {
          periodEnd: data.periodEnd,
          submitUrl: `/attendance/timesheet/submit`,
        },
      );
      
      this.logger.log(`Timesheet reminder sent to: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process timesheet reminder: ${error.message}`);
    }
  }

  // ==================== System Events ====================

  /**
   * Listen to integration failure events
   */
  @OnEvent('integration.failed')
  async handleIntegrationFailed(data: { tenantId: string; userId: string; integration: string; error: string; timestamp: Date }) {
    this.logger.debug(`Integration failure: ${data.integration}`);
    
    try {
      const payload = {
        tenantId: data.tenantId,
        userId: data.userId,
        event: NotificationTriggerEvent.INTEGRATION_FAILED,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipient: data.userId,
        data: {
          integration: data.integration,
          error: data.error,
          timestamp: data.timestamp,
          supportUrl: `/support`,
        },
        actions: [
          { label: 'Contact Support', url: `/support` },
          { label: 'View Logs', url: `/system/logs` },
        ],
        expiresInMinutes: 1440,
      };
      
      await this.dispatcherService.dispatch(payload);
      
      // Send WebSocket alert to admin
      await this.webSocketService.sendSystemAlert(
        [data.userId],
        data.tenantId,
        '🚨 Integration Failed',
        `The ${data.integration} integration failed at ${data.timestamp}. Error: ${data.error}`,
        'error',
      );
      
      this.logger.log(`Integration failure notification sent to admin: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process integration failure notification: ${error.message}`);
    }
  }
}