// rules/overtime.rule.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OvertimeCalculator } from '../../attendance/helpers/overtime-calculator';
import { TimeUtils } from '../../attendance/helpers/time-utils';
import {
  NotificationTriggerEvent,
  NotificationPriority,
  NotificationChannel,
  NotificationPayload,
  PRIORITY_CHANNEL_RULES,
} from '../types/notification.types';

export interface OvertimeEventData {
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
  clockOutTime: Date;
  scheduledStartTime: string;
  scheduledEndTime: string;
  totalWorkHours: number;
  department: string;
  departmentId: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  companyId: string;
  hourlyRate?: number;
  overtimeMultiplier?: number;
}

export interface OvertimeThresholds {
  dailyWarning: number;      // Hours before triggering warning (e.g., 8)
  dailyLimit: number;        // Maximum daily hours (e.g., 12)
  weeklyWarning: number;     // Weekly hours before warning (e.g., 40)
  weeklyLimit: number;       // Maximum weekly hours (e.g., 48)
  monthlyWarning: number;    // Monthly hours before warning (e.g., 160)
  monthlyLimit: number;      // Maximum monthly hours (e.g., 200)
  overtimeThreshold: number; // Hours after which overtime applies (e.g., 8)
}

export interface OvertimeRuleResult {
  shouldNotify: boolean;
  overtimeHours?: number;
  notificationType?: 'warning' | 'limit_approaching' | 'limit_reached' | 'daily_summary';
  payload?: NotificationPayload;
}

@Injectable()
export class OvertimeRule {
  private readonly logger = new Logger(OvertimeRule.name);

  // Default thresholds (can be overridden by company settings)
  private readonly thresholds: OvertimeThresholds = {
    dailyWarning: 8,
    dailyLimit: 12,
    weeklyWarning: 40,
    weeklyLimit: 48,
    monthlyWarning: 160,
    monthlyLimit: 200,
    overtimeThreshold: 8,
  };

  // Configuration
  private readonly NOTIFICATION_COOLDOWN_HOURS = 4;
  private readonly APPROACHING_THRESHOLD_PERCENT = 80; // 80% of limit
  private readonly OVERTIME_RATE_MULTIPLIER = 1.5;

  constructor(
    private overtimeCalculator: OvertimeCalculator,
    private timeUtils: TimeUtils,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Evaluate overtime after clock-out
   */
  async evaluate(event: OvertimeEventData): Promise<OvertimeRuleResult> {
    this.logger.debug(`Evaluating overtime for user: ${event.userId}, hours: ${event.totalWorkHours}`);

    try {
      // Calculate overtime for this shift
      const shiftOvertime = this.overtimeCalculator.calculateOvertimeHours(
        event.clockInTime,
        event.clockOutTime,
      );

      if (shiftOvertime <= 0) {
        return { shouldNotify: false };
      }

      // Get cumulative overtime data
      const weeklyOvertime = await this.getWeeklyOvertime(event.userId, event.shiftDate);
      const monthlyOvertime = await this.getMonthlyOvertime(event.userId, event.shiftDate);
      const yearToDateOvertime = await this.getYearToDateOvertime(event.userId, event.shiftDate);

      // Get weekly and monthly total hours
      const weeklyTotalHours = await this.getWeeklyTotalHours(event.userId, event.shiftDate);
      const monthlyTotalHours = await this.getMonthlyTotalHours(event.userId, event.shiftDate);

      // Check for limit breaches
      const dailyLimitBreach = event.totalWorkHours > this.thresholds.dailyLimit;
      const weeklyLimitBreach = weeklyTotalHours > this.thresholds.weeklyLimit;
      const monthlyLimitBreach = monthlyTotalHours > this.thresholds.monthlyLimit;

      // Check for approaching limits
      const dailyApproaching = event.totalWorkHours >= this.thresholds.dailyWarning;
      const weeklyApproaching = weeklyTotalHours >= (this.thresholds.weeklyLimit * this.APPROACHING_THRESHOLD_PERCENT / 100);
      const monthlyApproaching = monthlyTotalHours >= (this.thresholds.monthlyLimit * this.APPROACHING_THRESHOLD_PERCENT / 100);

      // Check if already notified recently
      const wasNotifiedRecently = await this.wasNotifiedRecently(event.userId, event.shiftDate);
      
      // Determine notification type
      let notificationType: 'warning' | 'limit_approaching' | 'limit_reached' | 'daily_summary' | null = null;
      
      if (dailyLimitBreach || weeklyLimitBreach || monthlyLimitBreach) {
        notificationType = 'limit_reached';
      } else if (dailyApproaching || weeklyApproaching || monthlyApproaching) {
        notificationType = 'limit_approaching';
      } else if (shiftOvertime > 0 && !wasNotifiedRecently) {
        notificationType = 'warning';
      }

      if (!notificationType) {
        return { shouldNotify: false };
      }

      // Determine priority based on severity
      const priority = this.determinePriority(
        shiftOvertime,
        weeklyOvertime,
        dailyLimitBreach || weeklyLimitBreach || monthlyLimitBreach,
      );

      // Get channels based on priority
      const channels = this.getChannelsForPriority(priority);

      // Calculate overtime pay if rate info is available
      const overtimePay = this.calculateOvertimePay(
        shiftOvertime,
        event.hourlyRate,
        event.overtimeMultiplier,
      );

      // Generate notification content
      const { title, body, actions } = this.generateNotificationContent(
        event,
        shiftOvertime,
        weeklyOvertime,
        monthlyOvertime,
        yearToDateOvertime,
        weeklyTotalHours,
        monthlyTotalHours,
        notificationType,
        overtimePay,
      );

      // Determine recipient
      const recipient = this.getRecipient(event, priority);

      // Check if manager should be notified
      const notifyManager = this.shouldNotifyManager(
        shiftOvertime,
        weeklyOvertime,
        dailyLimitBreach || weeklyLimitBreach || monthlyLimitBreach,
      );

      // Prepare payload data
      const payloadData = {
        employeeName: event.employeeName,
        shiftDate: this.formatDate(event.shiftDate),
        shiftStart: this.formatTime(event.clockInTime),
        shiftEnd: this.formatTime(event.clockOutTime),
        totalWorkHours: event.totalWorkHours.toFixed(1),
        shiftOvertime: shiftOvertime.toFixed(1),
        weeklyOvertime: weeklyOvertime.toFixed(1),
        monthlyOvertime: monthlyOvertime.toFixed(1),
        yearToDateOvertime: yearToDateOvertime.toFixed(1),
        weeklyTotalHours: weeklyTotalHours.toFixed(1),
        monthlyTotalHours: monthlyTotalHours.toFixed(1),
        weeklyLimit: this.thresholds.weeklyLimit,
        monthlyLimit: this.thresholds.monthlyLimit,
        dailyLimit: this.thresholds.dailyLimit,
        overtimeRate: this.OVERTIME_RATE_MULTIPLIER,
        overtimePay: overtimePay ? `$${overtimePay.toFixed(2)}` : 'Calculated on payroll',
        notificationType,
        viewUrl: `/attendance/records/${event.attendanceRecordId}`,
        timesheetUrl: `/attendance/timesheet`,
        overtimeReportUrl: `/reports/overtime`,
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
        event: NotificationTriggerEvent.OVERTIME_RECORDED,
        priority,
        channels,
        recipient,
        data: payloadData,
        actions,
        expiresInMinutes: 1440, // 1 day
      };

      // Emit event for analytics
      this.eventEmitter.emit('overtime.detected', {
        tenantId: event.tenantId,
        userId: event.userId,
        employeeName: event.employeeName,
        shiftOvertime,
        weeklyOvertime,
        monthlyOvertime,
        shiftDate: event.shiftDate,
        notificationType,
        priority,
      });

      return {
        shouldNotify: true,
        overtimeHours: shiftOvertime,
        notificationType,
        payload,
      };

    } catch (error) {
      this.logger.error(`Failed to evaluate overtime: ${error.message}`);
      return { shouldNotify: false };
    }
  }

  /**
   * Check for overtime approaching before clock-out (proactive)
   */
  async checkApproachingOvertime(event: OvertimeEventData): Promise<OvertimeRuleResult> {
    this.logger.debug(`Checking approaching overtime for user: ${event.userId}`);

    try {
      const currentTime = new Date();
      const hoursWorkedSoFar = this.calculateHoursDifference(event.clockInTime, currentTime);
      const projectedTotalHours = hoursWorkedSoFar + this.getRemainingShiftHours(currentTime, event.scheduledEndTime);
      
      const projectedOvertime = Math.max(0, projectedTotalHours - this.thresholds.overtimeThreshold);
      
      if (projectedOvertime <= 0) {
        return { shouldNotify: false };
      }

      // Check if approaching limit (within 1 hour of overtime)
      if (projectedOvertime < 1) {
        return { shouldNotify: false };
      }

      const weeklyOvertime = await this.getWeeklyOvertime(event.userId, event.shiftDate);
      const monthlyOvertime = await this.getMonthlyOvertime(event.userId, event.shiftDate);

      const payload: NotificationPayload = {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.OVERTIME_APPROACHING,
        priority: NotificationPriority.MEDIUM,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: event.employeeEmail,
        data: {
          employeeName: event.employeeName,
          shiftDate: this.formatDate(event.shiftDate),
          hoursWorkedSoFar: hoursWorkedSoFar.toFixed(1),
          projectedOvertime: projectedOvertime.toFixed(1),
          weeklyOvertime: weeklyOvertime.toFixed(1),
          monthlyOvertime: monthlyOvertime.toFixed(1),
          overtimeThreshold: this.thresholds.overtimeThreshold,
          message: `You are about to exceed ${this.thresholds.overtimeThreshold} hours today. Projected overtime: ${projectedOvertime.toFixed(1)} hours.`,
        },
        actions: [
          { label: 'View Timecard', url: `/attendance/records/${event.attendanceRecordId}` },
          { label: 'Contact Manager', url: `/users/contact/${event.managerId}` },
        ],
        expiresInMinutes: 120, // 2 hours
      };

      this.eventEmitter.emit('overtime.approaching', {
        tenantId: event.tenantId,
        userId: event.userId,
        projectedOvertime,
      });

      return {
        shouldNotify: true,
        overtimeHours: projectedOvertime,
        notificationType: 'limit_approaching',
        payload,
      };

    } catch (error) {
      this.logger.error(`Failed to check approaching overtime: ${error.message}`);
      return { shouldNotify: false };
    }
  }

  /**
   * Send weekly overtime summary
   */
  async sendWeeklySummary(tenantId: string, userId: string, weekEndDate: Date): Promise<void> {
    this.logger.debug(`Sending weekly overtime summary for user: ${userId}`);

    try {
      const weekStart = new Date(weekEndDate);
      weekStart.setDate(weekStart.getDate() - 6);
      
      const weeklyOvertime = await this.getWeeklyOvertime(userId, weekEndDate);
      const weeklyTotalHours = await this.getWeeklyTotalHours(userId, weekEndDate);
      
      if (weeklyOvertime <= 0) {
        return;
      }

      const payload: NotificationPayload = {
        tenantId,
        userId,
        event: NotificationTriggerEvent.OVERTIME_RECORDED,
        priority: NotificationPriority.LOW,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        recipient: userId,
        data: {
          isWeeklySummary: true,
          weekStart: this.formatDate(weekStart),
          weekEnd: this.formatDate(weekEndDate),
          weeklyTotalHours: weeklyTotalHours.toFixed(1),
          weeklyOvertime: weeklyOvertime.toFixed(1),
          overtimeRate: this.OVERTIME_RATE_MULTIPLIER,
          reportUrl: `/reports/weekly/${this.formatDate(weekEndDate)}`,
        },
        actions: [
          { label: 'View Weekly Report', url: `/reports/weekly/${this.formatDate(weekEndDate)}` },
        ],
        expiresInMinutes: 4320, // 3 days
      };

      await this.dispatchNotification(payload);
      
    } catch (error) {
      this.logger.error(`Failed to send weekly summary: ${error.message}`);
    }
  }

  /**
   * Get overtime statistics for an employee
   */
  async getOvertimeStats(
    tenantId: string,
    userId: string,
    date: Date = new Date(),
  ): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    averageWeekly: number;
    projectedMonthly: number;
    overtimePayYTD: number;
  }> {
    const [weeklyOvertime, monthlyOvertime, yearlyOvertime] = await Promise.all([
      this.getWeeklyOvertime(userId, date),
      this.getMonthlyOvertime(userId, date),
      this.getYearToDateOvertime(userId, date),
    ]);

    return {
      today: 0, // Would need current day's overtime
      thisWeek: weeklyOvertime,
      thisMonth: monthlyOvertime,
      thisYear: yearlyOvertime,
      averageWeekly: weeklyOvertime / 4.33, // Approximate
      projectedMonthly: monthlyOvertime * 1.1,
      overtimePayYTD: yearlyOvertime * this.OVERTIME_RATE_MULTIPLIER * 25, // Assuming $25/hr base
    };
  }

  /**
   * Update overtime thresholds
   */
  updateThresholds(newThresholds: Partial<OvertimeThresholds>): void {
    Object.assign(this.thresholds, newThresholds);
    this.logger.log(`Overtime thresholds updated: ${JSON.stringify(this.thresholds)}`);
  }

  // ==================== Private Methods ====================

  private calculateHoursDifference(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }

  private getRemainingShiftHours(currentTime: Date, scheduledEndTime: string): number {
    const end = this.timeUtils.parseTimeString(scheduledEndTime);
    const endTime = new Date(currentTime);
    endTime.setHours(end.getHours(), end.getMinutes(), 0);
    
    if (currentTime > endTime) {
      return 0;
    }
    
    return this.calculateHoursDifference(currentTime, endTime);
  }

  private determinePriority(
    shiftOvertime: number,
    weeklyOvertime: number,
    isLimitBreach: boolean,
  ): NotificationPriority {
    if (isLimitBreach || shiftOvertime > 4 || weeklyOvertime > 20) {
      return NotificationPriority.HIGH;
    }
    if (shiftOvertime > 2 || weeklyOvertime > 10) {
      return NotificationPriority.MEDIUM;
    }
    return NotificationPriority.LOW;
  }

  private getChannelsForPriority(priority: NotificationPriority): NotificationChannel[] {
    return PRIORITY_CHANNEL_RULES[priority] || PRIORITY_CHANNEL_RULES[NotificationPriority.LOW];
  }

  private generateNotificationContent(
    event: OvertimeEventData,
    shiftOvertime: number,
    weeklyOvertime: number,
    monthlyOvertime: number,
    yearToDateOvertime: number,
    weeklyTotalHours: number,
    monthlyTotalHours: number,
    notificationType: string,
    overtimePay?: number,
  ): { title: string; body: string; actions: Array<{ label: string; url?: string; action?: string }> } {
    
    let title = '';
    let body = '';

    switch (notificationType) {
      case 'limit_reached':
        title = `🚨 Overtime Limit Reached - ${shiftOvertime.toFixed(1)} hours today`;
        body = `You have exceeded overtime limits:\n` +
               `• Daily: ${event.totalWorkHours.toFixed(1)}/${this.thresholds.dailyLimit} hours\n` +
               `• Weekly: ${weeklyTotalHours.toFixed(1)}/${this.thresholds.weeklyLimit} hours\n` +
               `• Monthly: ${monthlyTotalHours.toFixed(1)}/${this.thresholds.monthlyLimit} hours\n\n` +
               `Please review your timecard and speak with your manager.`;
        break;
        
      case 'limit_approaching':
        title = `⚠️ Approaching Overtime Limit - ${shiftOvertime.toFixed(1)} hours today`;
        body = `You are approaching overtime limits:\n` +
               `• Today: ${event.totalWorkHours.toFixed(1)}/${this.thresholds.dailyLimit} hours\n` +
               `• This week: ${weeklyTotalHours.toFixed(1)}/${this.thresholds.weeklyLimit} hours\n` +
               `• This month: ${monthlyTotalHours.toFixed(1)}/${this.thresholds.monthlyLimit} hours\n\n` +
               `Overtime rate (${this.OVERTIME_RATE_MULTIPLIER}x) applies after ${this.thresholds.overtimeThreshold} hours.`;
        break;
        
      default:
        title = `⏰ Overtime Recorded - ${shiftOvertime.toFixed(1)} hours`;
        body = `You worked ${shiftOvertime.toFixed(1)} hour(s) of overtime today.\n` +
               `• Weekly overtime: ${weeklyOvertime.toFixed(1)} hours\n` +
               `• Monthly overtime: ${monthlyOvertime.toFixed(1)} hours\n` +
               `• Year-to-date: ${yearToDateOvertime.toFixed(1)} hours\n\n` +
               `${overtimePay ? `Estimated overtime pay: $${overtimePay.toFixed(2)}` : 'Overtime will be calculated in payroll.'}`;
        break;
    }

    const actions = [
      { label: 'View Timecard', url: `/attendance/records/${event.attendanceRecordId}` },
      { label: 'View Timesheet', url: `/attendance/timesheet` },
    ];

    if (weeklyOvertime > 0) {
      actions.push({ label: 'Overtime Report', url: `/reports/overtime` });
    }

    return { title, body, actions };
  }

  private createManagerPayload(
    event: OvertimeEventData,
    data: any,
    priority: NotificationPriority,
    channels: NotificationChannel[],
  ): NotificationPayload {
    return {
      tenantId: event.tenantId,
      userId: event.managerId,
      event: NotificationTriggerEvent.OVERTIME_RECORDED,
      priority,
      channels,
      recipient: event.managerEmail,
      data: {
        ...data,
        isManagerNotification: true,
        employeeName: event.employeeName,
        employeeId: event.employeeId,
        department: event.department,
        reviewUrl: `/attendance/review/${event.attendanceRecordId}`,
        teamOvertimeUrl: `/reports/team-overtime`,
      },
      actions: [
        { label: 'Review Timecard', url: `/attendance/review/${event.attendanceRecordId}` },
        { label: 'View Team Overtime', url: `/reports/team-overtime` },
        { label: 'Contact Employee', url: `/users/contact/${event.userId}` },
      ],
      expiresInMinutes: 2880, // 2 days
    };
  }

  private shouldNotifyManager(
    shiftOvertime: number,
    weeklyOvertime: number,
    isLimitBreach: boolean,
  ): boolean {
    return isLimitBreach || shiftOvertime > 4 || weeklyOvertime > 20;
  }

  private getRecipient(event: OvertimeEventData, priority: NotificationPriority): string {
    if (priority === NotificationPriority.HIGH && event.employeePhone) {
      return event.employeePhone;
    }
    return event.employeeEmail;
  }

  private calculateOvertimePay(
    overtimeHours: number,
    hourlyRate?: number,
    multiplier?: number,
  ): number | null {
    if (!hourlyRate) return null;
    const rate = multiplier || this.OVERTIME_RATE_MULTIPLIER;
    return overtimeHours * hourlyRate * rate;
  }

  private async wasNotifiedRecently(userId: string, shiftDate: Date): Promise<boolean> {
    // This would query the database to check if a notification was sent recently
    // For now, return false (implement with your database repository)
    return false;
  }

  private async getWeeklyOvertime(userId: string, date: Date): Promise<number> {
    // This would query the database for weekly overtime
    // For now, return 0 (implement with your database repository)
    return 0;
  }

  private async getMonthlyOvertime(userId: string, date: Date): Promise<number> {
    // This would query the database for monthly overtime
    // For now, return 0 (implement with your database repository)
    return 0;
  }

  private async getYearToDateOvertime(userId: string, date: Date): Promise<number> {
    // This would query the database for YTD overtime
    // For now, return 0 (implement with your database repository)
    return 0;
  }

  private async getWeeklyTotalHours(userId: string, date: Date): Promise<number> {
    // This would query the database for weekly total hours
    // For now, return 0 (implement with your database repository)
    return 0;
  }

  private async getMonthlyTotalHours(userId: string, date: Date): Promise<number> {
    // This would query the database for monthly total hours
    // For now, return 0 (implement with your database repository)
    return 0;
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
}