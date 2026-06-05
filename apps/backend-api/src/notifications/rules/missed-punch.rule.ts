// rules/missed-punch.rule.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceCalculator } from '../../attendance/helpers/attendance-calculator';
import { TimeUtils } from '../../attendance/helpers/time-utils';
import {
  NotificationTriggerEvent,
  NotificationPriority,
  NotificationChannel,
  NotificationPayload,
  PRIORITY_CHANNEL_RULES,
} from '../types/notification.types';

export interface MissedPunchEventData {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
  attendanceRecordId: string;
  shiftId: string;
  shiftDate: Date;
  clockInTime: Date;
  scheduledClockOutTime: string;
  department: string;
  departmentId: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  companyId: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface MissedPunchRuleResult {
  shouldNotify: boolean;
  missedHours?: number;
  payload?: NotificationPayload;
}

@Injectable()
export class MissedPunchRule {
  private readonly logger = new Logger(MissedPunchRule.name);
  
  // Configuration
  private readonly MISSED_PUNCH_THRESHOLD_HOURS = 2; // Notify after 2 hours of no clock-out
  private readonly CRITICAL_MISSED_HOURS = 12; // Critical after 12 hours
  private readonly AUTO_CORRECT_HOURS = 24; // Auto-correct after 24 hours
  private readonly ALLOWED_MISSED_PUNCHES_PER_MONTH = 2;
  private readonly CORRECTION_DEADLINE_HOURS = 48;
  private readonly NOTIFICATION_COOLDOWN_HOURS = 4; // Don't send duplicate notifications within 4 hours

  constructor(
    private attendanceCalculator: AttendanceCalculator,
    private timeUtils: TimeUtils,
    private eventEmitter: EventEmitter2,
  ) {}

  async evaluate(event: MissedPunchEventData): Promise<MissedPunchRuleResult> {
    this.logger.debug(`Evaluating missed punch for user: ${event.userId}, date: ${event.shiftDate}`);

    try {
      // Calculate hours since clock-in
      const currentTime = new Date();
      const hoursSinceClockIn = this.calculateHoursDifference(event.clockInTime, currentTime);
      
      // Get scheduled end time as Date object
      const scheduledEnd = this.timeUtils.parseTimeString(event.scheduledClockOutTime);
      const scheduledEndTime = new Date(event.shiftDate);
      scheduledEndTime.setHours(scheduledEnd.getHours(), scheduledEnd.getMinutes(), 0);
      
      // Check if shift end time has passed
      const isPastShiftEnd = currentTime > scheduledEndTime;
      
      // If not past shift end, don't notify
      if (!isPastShiftEnd) {
        return { shouldNotify: false };
      }
      
      // Calculate missed hours (hours past shift end)
      const missedHours = this.calculateHoursDifference(scheduledEndTime, currentTime);
      
      // Check if within threshold
      if (missedHours < this.MISSED_PUNCH_THRESHOLD_HOURS) {
        return { shouldNotify: false };
      }
      
      // Check if already notified recently (would need to query DB)
      const wasNotifiedRecently = await this.wasNotifiedRecently(event.userId, event.shiftDate);
      if (wasNotifiedRecently) {
        this.logger.debug(`Skipping duplicate missed punch notification for ${event.userId}`);
        return { shouldNotify: false };
      }
      
      // Get missed punch count for the month
      const monthlyMissedCount = await this.getMonthlyMissedCount(event.userId, event.shiftDate);
      
      // Determine if auto-correction is needed
      const requiresAutoCorrection = missedHours >= this.AUTO_CORRECT_HOURS;
      
      // Determine severity
      const severity = this.determineSeverity(missedHours, monthlyMissedCount);
      
      // Determine priority
      const priority = this.determinePriority(missedHours, monthlyMissedCount, severity);
      
      // Get channels based on priority
      const channels = this.getChannelsForPriority(priority);
      
      // Generate notification content
      const { title, body, actions } = this.generateNotificationContent(
        event,
        missedHours,
        monthlyMissedCount + 1,
        severity,
        requiresAutoCorrection,
      );
      
      // Determine recipient
      const recipient = this.getRecipient(event, priority);
      
      // Determine if manager should be notified
      const notifyManager = this.shouldNotifyManager(missedHours, monthlyMissedCount, severity);
      
      // Prepare payload data
      const payloadData = {
        employeeName: event.employeeName,
        shiftDate: this.formatDate(event.shiftDate),
        clockInTime: this.formatTime(event.clockInTime),
        scheduledClockOut: this.formatTimeFromString(event.scheduledClockOutTime),
        missedHours: Math.floor(missedHours),
        missedMinutes: Math.floor(missedHours * 60),
        hoursSinceClockIn: Math.floor(hoursSinceClockIn),
        severity,
        monthlyMissedCount: monthlyMissedCount + 1,
        remainingAllowedMissed: Math.max(0, this.ALLOWED_MISSED_PUNCHES_PER_MONTH - (monthlyMissedCount + 1)),
        requiresAutoCorrection,
        correctionDeadline: this.CORRECTION_DEADLINE_HOURS,
        autoCorrectAt: requiresAutoCorrection 
          ? new Date(Date.now() + (this.AUTO_CORRECT_HOURS - missedHours) * 60 * 60 * 1000)
          : null,
        fixUrl: `/attendance/fix-missed-punch/${event.attendanceRecordId}`,
        viewUrl: `/attendance/records/${event.attendanceRecordId}`,
        department: event.department,
        managerName: event.managerName,
      };
      
      // If manager should be notified, create separate payload for manager
      if (notifyManager && event.managerId) {
        const managerPayload = this.createManagerPayload(event, payloadData, priority, channels);
        await this.dispatchNotification(managerPayload);
      }
      
      // Create payload for employee
      const payload: NotificationPayload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.MISSED_PUNCH,
        priority,
        channels,
        recipient,
        data: payloadData,
        actions,
        expiresInMinutes: this.CORRECTION_DEADLINE_HOURS * 60,
      };
      
      // Emit event for analytics
      this.eventEmitter.emit('missed-punch.detected', {
        tenantId: event.tenantId,
        userId: event.userId,
        employeeName: event.employeeName,
        missedHours,
        shiftDate: event.shiftDate,
        monthlyMissedCount: monthlyMissedCount + 1,
        severity,
        priority,
      });
      
      return {
        shouldNotify: true,
        missedHours,
        payload,
      };
      
    } catch (error) {
      this.logger.error(`Failed to evaluate missed punch: ${error.message}`);
      return { shouldNotify: false };
    }
  }

  /**
   * Check for missed punches system-wide (to be run by cron job)
   */
  async scanForMissedPunches(tenantId: string): Promise<{
    scanned: number;
    notified: number;
  }> {
    this.logger.log(`Scanning for missed punches in tenant: ${tenantId}`);
    
    // This would query the database for active clock-ins without clock-outs
    // Implementation depends on your database schema
    
    // Placeholder for actual implementation
    const activeSessions = await this.getActiveClockInSessions(tenantId);
    
    let notified = 0;
    for (const session of activeSessions) {
      const result = await this.evaluate(session);
      if (result.shouldNotify && result.payload) {
        notified++;
      }
    }
    
    return {
      scanned: activeSessions.length,
      notified,
    };
  }

  /**
   * Get missed punch statistics for an employee
   */
  async getEmployeeMissedPunchStats(
    tenantId: string,
    userId: string,
    date: Date = new Date(),
  ): Promise<{
    currentMonthCount: number;
    remainingAllowed: number;
    totalMissedHours: number;
    averageMissedHours: number;
    lastMissedDate: Date | null;
  }> {
    const monthlyCount = await this.getMonthlyMissedCount(userId, date);
    
    return {
      currentMonthCount: monthlyCount,
      remainingAllowed: Math.max(0, this.ALLOWED_MISSED_PUNCHES_PER_MONTH - monthlyCount),
      totalMissedHours: 0, // Calculate from actual records
      averageMissedHours: 0, // Calculate from actual records
      lastMissedDate: null, // Get from actual records
    };
  }

  // ==================== Private Methods ====================

  private calculateHoursDifference(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }

  private determineSeverity(missedHours: number, monthlyCount: number): 'minor' | 'moderate' | 'severe' | 'critical' {
    if (missedHours >= this.CRITICAL_MISSED_HOURS || monthlyCount >= this.ALLOWED_MISSED_PUNCHES_PER_MONTH) {
      return 'critical';
    }
    if (missedHours >= 8 || monthlyCount >= this.ALLOWED_MISSED_PUNCHES_PER_MONTH - 1) {
      return 'severe';
    }
    if (missedHours >= 4 || monthlyCount >= 1) {
      return 'moderate';
    }
    return 'minor';
  }

  private determinePriority(
    missedHours: number,
    monthlyCount: number,
    severity: string,
  ): NotificationPriority {
    if (severity === 'critical' || missedHours >= this.CRITICAL_MISSED_HOURS || monthlyCount >= this.ALLOWED_MISSED_PUNCHES_PER_MONTH) {
      return NotificationPriority.HIGH;
    }
    if (severity === 'severe' || missedHours >= 8 || monthlyCount >= this.ALLOWED_MISSED_PUNCHES_PER_MONTH - 1) {
      return NotificationPriority.MEDIUM;
    }
    return NotificationPriority.LOW;
  }

  private getChannelsForPriority(priority: NotificationPriority): NotificationChannel[] {
    return PRIORITY_CHANNEL_RULES[priority] || PRIORITY_CHANNEL_RULES[NotificationPriority.LOW];
  }

  private generateNotificationContent(
    event: MissedPunchEventData,
    missedHours: number,
    monthlyCount: number,
    severity: string,
    requiresAutoCorrection: boolean,
  ): { title: string; body: string; actions: Array<{ label: string; url?: string; action?: string }> } {
    const missedHoursInt = Math.floor(missedHours);
    const missedMinutes = Math.floor(missedHours * 60);
    
    let title = '';
    let body = '';
    
    if (severity === 'critical') {
      title = `🚨 CRITICAL: Missed Clock-Out - ${missedHoursInt} hours overdue`;
      body = `You forgot to clock out on ${this.formatDate(event.shiftDate)}. Your shift ended at ${this.formatTimeFromString(event.scheduledClockOutTime)} and you are still clocked in (${missedHoursInt} hours ago). This is your ${monthlyCount}${this.getOrdinalSuffix(monthlyCount)} missed punch this month. Please fix immediately to avoid payroll issues.`;
    } else if (severity === 'severe') {
      title = `⚠️ Missed Clock-Out Alert - ${missedHoursInt} hours overdue`;
      body = `You forgot to clock out on ${this.formatDate(event.shiftDate)}. Your shift ended at ${this.formatTimeFromString(event.scheduledClockOutTime)}. Please correct this within ${this.CORRECTION_DEADLINE_HOURS} hours.`;
    } else if (severity === 'moderate') {
      title = `Missed Clock-Out: ${missedHoursInt} hours overdue`;
      body = `You appear to have forgotten to clock out after your shift on ${this.formatDate(event.shiftDate)}. Please fix your timecard as soon as possible.`;
    } else {
      title = `Reminder: Complete Your Clock-Out`;
      body = `Your shift ended at ${this.formatTimeFromString(event.scheduledClockOutTime)} but you're still clocked in. Please clock out to ensure accurate time tracking.`;
    }
    
    if (requiresAutoCorrection) {
      body += ` If not corrected within ${this.AUTO_CORRECT_HOURS} hours of shift end, the system will auto-correct your clock-out time to ${this.formatTimeFromString(event.scheduledClockOutTime)}.`;
    }
    
    const actions = [
      {
        label: 'Fix Missed Punch',
        url: `/attendance/fix-missed-punch/${event.attendanceRecordId}`,
      },
      {
        label: 'View Timecard',
        url: `/attendance/records/${event.attendanceRecordId}`,
      },
    ];
    
    if (requiresAutoCorrection) {
      actions.push({
        label: 'Request Exception',
        url: `/attendance/request-exception/${event.attendanceRecordId}`,
      });
    }
    
    return { title, body, actions };
  }

  private createManagerPayload(
    event: MissedPunchEventData,
    data: any,
    priority: NotificationPriority,
    channels: NotificationChannel[],
  ): NotificationPayload {
    return {
      tenantId: event.tenantId,
      userId: event.managerId,
      event: NotificationTriggerEvent.MISSED_PUNCH,
      priority,
      channels,
      recipient: event.managerEmail,
      data: {
        ...data,
        isManagerNotification: true,
        employeeName: event.employeeName,
        reviewUrl: `/attendance/review/${event.attendanceRecordId}`,
        approveCorrectionUrl: `/attendance/approve-correction/${event.attendanceRecordId}`,
      },
      actions: [
        { label: 'Review Timecard', url: `/attendance/review/${event.attendanceRecordId}` },
        { label: 'Contact Employee', url: `/users/contact/${event.userId}` },
      ],
      expiresInMinutes: this.CORRECTION_DEADLINE_HOURS * 60,
    };
  }

  private shouldNotifyManager(
    missedHours: number,
    monthlyCount: number,
    severity: string,
  ): boolean {
    return severity === 'critical' || 
           missedHours >= 8 || 
           monthlyCount >= this.ALLOWED_MISSED_PUNCHES_PER_MONTH - 1;
  }

  private getRecipient(event: MissedPunchEventData, priority: NotificationPriority): string {
    if (priority === NotificationPriority.HIGH && event.employeePhone) {
      return event.employeePhone;
    }
    return event.employeeEmail;
  }

  private async wasNotifiedRecently(userId: string, shiftDate: Date): Promise<boolean> {
    // This would query the database to check if a notification was sent recently
    // For now, return false (implement with your database repository)
    return false;
  }

  private async getMonthlyMissedCount(userId: string, date: Date): Promise<number> {
    // This would query the database for missed punch count in the current month
    // For now, return 0 (implement with your database repository)
    return 0;
  }

  private async getActiveClockInSessions(tenantId: string): Promise<MissedPunchEventData[]> {
    // This would query the database for active clock-in sessions without clock-out
    // For now, return empty array (implement with your database repository)
    return [];
  }

  private async dispatchNotification(payload: NotificationPayload): Promise<void> {
    // This would call the dispatcher service
    // For now, just log
    this.logger.debug(`Would dispatch notification: ${payload.event} to ${payload.userId}`);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private formatTimeFromString(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }
}