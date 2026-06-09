import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DispatcherService } from '../services/dispatcher.service';
import { LateInRule } from '../rules/late-in.rule';
import { MissedPunchRule } from '../rules/missed-punch.rule';
import { OvertimeRule } from '../rules/overtime.rule';
import {
  NotificationTriggerEvent,
  NotificationPriority,
  NotificationChannel,
} from '../types/notification.types';



export interface ClockInEvent {
  tenantId: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  employeePhone?: string;
  attendanceRecordId: string;
  shiftId?: string;
  shiftDate: Date;
  scheduledStartTime?: string;
  actualClockInTime: Date;
  scheduledEndTime?: string;
  department?: string;
  departmentId?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  companyId?: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface ClockOutEvent {
  tenantId: string;
  userId: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  attendanceRecordId: string;
  shiftId?: string;
  shiftDate: Date;
  scheduledEndTime?: string;
  actualClockOutTime: Date;
  scheduledStartTime?: string;
  totalWorkHours?: number;
  department?: string;
  managerId?: string;
}

export interface LeaveRequestEvent {
  tenantId: string;
  userId: string;
  employeeId?: string;
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
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  attendanceRecordId: string;
  shiftDate: Date;
  editedBy: string;
  editedByName: string;
  changes: Record<string, any>;
  department?: string;
  managerId?: string;
}

export interface ShiftAssignmentEvent {
  tenantId: string;
  userId: string;
  employeeId?: string;
  employeeName: string;
  employeeEmail: string;
  shiftId: string;
  shiftDate: Date;
  shiftStart: string;
  shiftEnd: string;
  department?: string;
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
  ) {}

  // ── Attendance ────────────────────────────────────────────────────────────

  @OnEvent('attendance.clock-in.completed')
  async handleClockIn(event: ClockInEvent) {
    this.logger.debug(`Clock-in event for user: ${event.userId}`);
    try {
      const result = await this.lateInRule.evaluate(event);
      if (result.shouldNotify && result.payload) {
        await this.dispatcherService.dispatch(result.payload);
        this.logger.log(`Late notification dispatched for ${event.userId}, ${result.lateMinutes}min late`);
      }
    } catch (error) {
      this.logger.error(`Clock-in notification failed: ${error.message}`);
    }
  }

  @OnEvent('attendance.clock-out.completed')
  async handleClockOut(event: ClockOutEvent) {
    this.logger.debug(`Clock-out event for user: ${event.userId}`);
    try {
      const overtimeResult = await this.overtimeRule.evaluate(event);
      if (overtimeResult.shouldNotify && overtimeResult.payload) {
        await this.dispatcherService.dispatch(overtimeResult.payload);
        this.logger.log(`Overtime notification dispatched for ${event.userId}`);
      }
    } catch (error) {
      this.logger.error(`Clock-out notification failed: ${error.message}`);
    }
  }

  @OnEvent('attendance.missed-punch.check')
  async handleMissedPunchCheck(data: { tenantId: string; userId: string; attendanceRecord: any }) {
    this.logger.debug(`Missed punch check for user: ${data.userId}`);
    try {
      const result = await this.missedPunchRule.evaluate(data);
      if (result.shouldNotify && result.payload) {
        await this.dispatcherService.dispatch(result.payload);
        this.logger.log(`Missed punch notification dispatched for ${data.userId}`);
      }
    } catch (error) {
      this.logger.error(`Missed punch notification failed: ${error.message}`);
    }
  }

  // ── Leave ─────────────────────────────────────────────────────────────────

  @OnEvent('leave.request.created')
  async handleLeaveRequestCreated(event: LeaveRequestEvent) {
    try {
      await this.dispatcherService.dispatch({
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
        },
        expiresInMinutes: 10080,
      });
      this.logger.log(`Leave request notification sent to manager: ${event.managerId}`);
    } catch (error) {
      this.logger.error(`Leave request notification failed: ${error.message}`);
    }
  }

  @OnEvent('leave.request.approved')
  async handleLeaveRequestApproved(event: LeaveRequestEvent) {
    try {
      await this.dispatcherService.dispatch({
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
          approvedBy: event.managerName,
          leaveRequestId: event.leaveRequestId,
        },
        expiresInMinutes: 10080,
      });
      this.logger.log(`Leave approval notification sent to: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Leave approval notification failed: ${error.message}`);
    }
  }

  @OnEvent('leave.request.rejected')
  async handleLeaveRequestRejected(event: LeaveRequestEvent & { rejectionReason?: string }) {
    try {
      await this.dispatcherService.dispatch({
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
        },
        expiresInMinutes: 4320,
      });
      this.logger.log(`Leave rejection notification sent to: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Leave rejection notification failed: ${error.message}`);
    }
  }

  // ── Timecard ──────────────────────────────────────────────────────────────

  @OnEvent('timecard.edited')
  async handleTimecardEdited(event: TimecardEditEvent) {
    try {
      await this.dispatcherService.dispatch({
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.TIMECARD_EDITED,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: event.employeeEmail ?? event.userId,
        data: {
          employeeName: event.employeeName,
          shiftDate: event.shiftDate,
          editedBy: event.editedByName,
          changes: event.changes,
          attendanceRecordId: event.attendanceRecordId,
        },
        expiresInMinutes: 1440,
      });
      this.logger.log(`Timecard edit notification sent to: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Timecard edit notification failed: ${error.message}`);
    }
  }

  // ── Shift ─────────────────────────────────────────────────────────────────

  @OnEvent('shift.assigned')
  async handleShiftAssigned(event: ShiftAssignmentEvent) {
    try {
      await this.dispatcherService.dispatch({
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
        },
        expiresInMinutes: 1440,
      });
      this.logger.log(`Shift assignment notification sent to: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Shift assignment notification failed: ${error.message}`);
    }
  }

  @OnEvent('shift.changed')
  async handleShiftChanged(event: ShiftAssignmentEvent & { oldShiftStart: string; oldShiftEnd: string }) {
    try {
      await this.dispatcherService.dispatch({
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
        },
        expiresInMinutes: 720,
      });
      this.logger.log(`Shift change notification sent to: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Shift change notification failed: ${error.message}`);
    }
  }

  // ── Schedule ──────────────────────────────────────────────────────────────

  @OnEvent('schedule.posted')
  async handleSchedulePosted(data: { tenantId: string; userIds: string[]; weekStart: Date; postedBy: string }) {
    try {
      await this.dispatcherService.bulkDispatch(
        data.userIds.map(userId => ({
          tenantId: data.tenantId,
          userId,
          event: NotificationTriggerEvent.SCHEDULE_POSTED,
          priority: NotificationPriority.LOW,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          recipient: userId,
          data: { weekStart: data.weekStart, postedBy: data.postedBy },
          expiresInMinutes: 10080,
        })),
      );
      this.logger.log(`Schedule posted notifications sent to ${data.userIds.length} employees`);
    } catch (error) {
      this.logger.error(`Schedule posted notification failed: ${error.message}`);
    }
  }

  // ── Reminders ─────────────────────────────────────────────────────────────

  @OnEvent('reminder.clock-in')
  async handleClockInReminder(data: { tenantId: string; userId: string; employeeName: string; employeeEmail: string; scheduledStartTime: string }) {
    try {
      await this.dispatcherService.dispatch({
        tenantId: data.tenantId,
        userId: data.userId,
        event: NotificationTriggerEvent.CLOCK_IN_REMINDER,
        priority: NotificationPriority.LOW,
        channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
        recipient: data.employeeEmail,
        data: { employeeName: data.employeeName, scheduledStartTime: data.scheduledStartTime },
        expiresInMinutes: 60,
      });
      this.logger.log(`Clock-in reminder sent to: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Clock-in reminder failed: ${error.message}`);
    }
  }

  @OnEvent('reminder.unsubmitted-timesheet')
  async handleUnsubmittedTimesheet(data: { tenantId: string; userId: string; employeeName: string; employeeEmail: string; periodEnd: Date }) {
    try {
      await this.dispatcherService.dispatch({
        tenantId: data.tenantId,
        userId: data.userId,
        event: NotificationTriggerEvent.UNSUBMITTED_TIMESHEET,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: data.employeeEmail,
        data: { employeeName: data.employeeName, periodEnd: data.periodEnd },
        expiresInMinutes: 2880,
      });
      this.logger.log(`Timesheet reminder sent to: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Timesheet reminder failed: ${error.message}`);
    }
  }

  // ── System ────────────────────────────────────────────────────────────────

  @OnEvent('integration.failed')
  async handleIntegrationFailed(data: { tenantId: string; userId: string; integration: string; error: string; timestamp: Date }) {
    try {
      await this.dispatcherService.dispatch({
        tenantId: data.tenantId,
        userId: data.userId,
        event: NotificationTriggerEvent.INTEGRATION_FAILED,
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        recipient: data.userId,
        data: { integration: data.integration, error: data.error, timestamp: data.timestamp },
        expiresInMinutes: 1440,
      });
      this.logger.log(`Integration failure notification sent to: ${data.userId}`);
    } catch (error) {
      this.logger.error(`Integration failure notification failed: ${error.message}`);
    }
  }
}