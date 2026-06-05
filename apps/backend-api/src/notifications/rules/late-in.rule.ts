// rules/late-in.rule.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceCalculator } from '../../attendance/helpers/attendance-calculator';
import { OvertimeCalculator } from '../../attendance/helpers/overtime-calculator';
import { TimeUtils } from '../../attendance/helpers/time-utils';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { WORK_HOURS, ATTENDANCE_STATUS } from '../../attendance/constants/attendance.constants';
import {
  NotificationTriggerEvent,
  NotificationPriority,
  NotificationChannel,
  NotificationPayload,
  PRIORITY_CHANNEL_RULES,
} from '../types/notification.types';

export interface ClockInEventData {
  tenantId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeePhone?: string;
  attendanceRecord: Attendance;
  shiftId: string;
  shiftDate: Date;
  scheduledStartTime: string; // Format: "09:00:00"
  actualClockInTime: Date;
  scheduledEndTime: string; // Format: "17:00:00"
  department: string;
  departmentId: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  companyId: string;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

export interface LateInRuleResult {
  shouldNotify: boolean;
  lateMinutes: number;
  payload?: NotificationPayload;
}

@Injectable()
export class LateInRule {
  private readonly GRACE_PERIOD_MINUTES = 15;
  private readonly ALLOWED_LATE_COUNT_PER_MONTH = 3;
  private readonly JUSTIFICATION_DEADLINE_HOURS = 24;

  constructor(
    private attendanceCalculator: AttendanceCalculator,
    private overtimeCalculator: OvertimeCalculator,
    private timeUtils: TimeUtils,
    private eventEmitter: EventEmitter2,
  ) {}

  async evaluate(event: ClockInEventData): Promise<LateInRuleResult> {
    // 1. Calculate late minutes using existing AttendanceCalculator
    const totalLateMinutes = this.attendanceCalculator.calculateLateMinutes(
      event.actualClockInTime,
      event.scheduledStartTime,
    );

    // If not late, return early
    if (totalLateMinutes === 0) {
      return {
        shouldNotify: false,
        lateMinutes: 0,
      };
    }

    // 2. Calculate actual late minutes after grace period
    const actualLateMinutes = Math.max(0, totalLateMinutes - this.GRACE_PERIOD_MINUTES);

    // If within grace period, no notification
    if (actualLateMinutes === 0) {
      return {
        shouldNotify: false,
        lateMinutes: 0,
      };
    }

    // 3. Get attendance status using existing method
    const totalWorkHours = this.attendanceCalculator.calculateWorkHours(
      event.actualClockInTime,
      this.timeUtils.parseTimeString(event.scheduledEndTime),
    );

    const status = this.attendanceCalculator.determineStatus(
      event.actualClockInTime,
      null as any, // checkOut not yet available
      totalLateMinutes,
      totalWorkHours,
      event.isHoliday || false,
      event.isWeekend || false,
    );

    // 4. Get late count for the month (placeholder - implement with your DB)
    const monthlyLateCount = await this.getMonthlyLateCount(
      event.userId,
      event.actualClockInTime,
    );

    // 5. Check if exceeds monthly limit
    const exceedsMonthlyLimit = monthlyLateCount >= this.ALLOWED_LATE_COUNT_PER_MONTH;

    // 6. Generate warning message
    const warningMessage = this.generateWarningMessage(actualLateMinutes, monthlyLateCount);

    // 7. Determine priority based on lateness and history
    const priority = this.determinePriority(
      actualLateMinutes,
      monthlyLateCount,
      exceedsMonthlyLimit,
    );

    // 8. Determine channels based on priority
    const channels = this.getChannelsForPriority(priority);

    // 9. Check if should send SMS (respect DND hours)
    const shouldSendSms = this.shouldSendSmsNow(channels, priority);
    const finalChannels = shouldSendSms
      ? channels
      : channels.filter(ch => ch !== NotificationChannel.SMS);

    // 10. Determine recipient
    const recipient = this.getRecipientChannel(event, priority);

    // 11. Generate notification content
    const { title, body, actions } = this.generateNotificationContent(
      actualLateMinutes,
      totalLateMinutes,
      monthlyLateCount + 1,
      exceedsMonthlyLimit,
      warningMessage,
      event,
    );

    // 12. Determine expiration (1 day for HIGH, 7 days for others)
    const expiresInMinutes = priority === NotificationPriority.HIGH ? 1440 : 10080;

    // 13. Emit event for analytics
    this.eventEmitter.emit('late-in.detected', {
      tenantId: event.tenantId,
      userId: event.userId,
      employeeName: event.employeeName,
      lateMinutes: actualLateMinutes,
      shiftDate: event.shiftDate,
      monthlyLateCount: monthlyLateCount + 1,
      exceedsMonthlyLimit,
      priority,
      status,
    });

    // 14. Return notification payload
    return {
      shouldNotify: true,
      lateMinutes: actualLateMinutes,
      payload: {
        tenantId: event.tenantId,
        userId: event.userId,
        event: NotificationTriggerEvent.LATE_IN,
        priority,
        channels: finalChannels,
        recipient,
        data: {
          // Late details
          lateMinutes: actualLateMinutes,
          totalLateMinutes,
          gracePeriodApplied: this.GRACE_PERIOD_MINUTES,
          lateThreshold: WORK_HOURS.LATE_THRESHOLD_MINUTES,
          
          // Shift details
          shiftStart: this.timeUtils.formatTime(
            this.timeUtils.parseTimeString(event.scheduledStartTime)
          ),
          actualClockIn: this.timeUtils.formatTime(event.actualClockInTime),
          shiftDate: this.timeUtils.formatDate(event.actualClockInTime),
          shiftEnd: this.timeUtils.formatTime(
            this.timeUtils.parseTimeString(event.scheduledEndTime)
          ),
          
          // Attendance status
          status,
          totalWorkHours,
          
          // Warning details
          warningMessage,
          warningCount: monthlyLateCount + 1,
          monthlyLateCount: monthlyLateCount + 1,
          remainingAllowedLate: Math.max(0, this.ALLOWED_LATE_COUNT_PER_MONTH - (monthlyLateCount + 1)),
          exceedsMonthlyLimit,
          
          // Action requirements
          requiresJustification: this.shouldRequireJustification(
            actualLateMinutes,
            monthlyLateCount,
            exceedsMonthlyLimit,
          ),
          justificationDeadline: this.JUSTIFICATION_DEADLINE_HOURS,
          
          // Employee info
          employeeName: event.employeeName,
          employeeId: event.employeeId,
          department: event.department,
          managerName: event.managerName,
          
          // URLs for actions
          justifyUrl: `/attendance/justify/${event.attendanceRecord.id}`,
          viewUrl: `/attendance/history`,
          policyUrl: `/attendance/policy`,
        },
        actions,
        expiresInMinutes,
      },
    };
  }

  private determinePriority(
    lateMinutes: number,
    monthlyLateCount: number,
    exceedsMonthlyLimit: boolean,
  ): NotificationPriority {
    // HIGH priority for severe cases
    if (exceedsMonthlyLimit || lateMinutes > 60 || monthlyLateCount >= 3) {
      return NotificationPriority.HIGH;
    }
    
    // MEDIUM priority for moderate lateness
    if (lateMinutes > 30 || monthlyLateCount >= 2) {
      return NotificationPriority.MEDIUM;
    }
    
    // LOW priority for minor lateness
    return NotificationPriority.LOW;
  }

  private getChannelsForPriority(priority: NotificationPriority): NotificationChannel[] {
    return PRIORITY_CHANNEL_RULES[priority] || PRIORITY_CHANNEL_RULES[NotificationPriority.LOW];
  }

  private shouldSendSmsNow(channels: NotificationChannel[], priority: NotificationPriority): boolean {
    // If SMS is not in channels, no need to check
    if (!channels.includes(NotificationChannel.SMS)) {
      return false;
    }
    
    // HIGH priority events always send SMS regardless of DND
    if (priority === NotificationPriority.HIGH) {
      return true;
    }
    
    // Check DND hours for non-high priority (10 PM to 7 AM)
    const currentHour = new Date().getHours();
    const isDND = currentHour >= 22 || currentHour < 7;
    
    return !isDND;
  }

  private getRecipientChannel(event: ClockInEventData, priority: NotificationPriority): string {
    // For HIGH priority, use phone for SMS if available
    if (priority === NotificationPriority.HIGH && event.employeePhone) {
      return event.employeePhone;
    }
    // Default to email
    return event.employeeEmail;
  }

  private generateNotificationContent(
    lateMinutes: number,
    totalLateMinutes: number,
    monthlyCount: number,
    exceedsMonthlyLimit: boolean,
    warningMessage: string,
    event: ClockInEventData,
  ): { title: string; body: string; actions: Array<{ label: string; url?: string; action?: string }> } {
    const shiftTime = this.timeUtils.formatTime(
      this.timeUtils.parseTimeString(event.scheduledStartTime)
    );
    const justifyUrl = `/attendance/justify/${event.attendanceRecord.id}`;
    const viewUrl = `/attendance/history`;
    const policyUrl = `/attendance/policy`;

    let title = '';
    let body = '';

    // Different titles based on severity
    if (exceedsMonthlyLimit) {
      title = `⚠️ CRITICAL: Late Limit Exceeded - ${lateMinutes} min late`;
      body = `You have exceeded the monthly allowed late limit (${this.ALLOWED_LATE_COUNT_PER_MONTH}/${this.ALLOWED_LATE_COUNT_PER_MONTH}). This is your ${monthlyCount}${this.getOrdinalSuffix(monthlyCount)} late this month. Please contact HR immediately. ${warningMessage}`;
    } else if (lateMinutes > 60) {
      title = `🚨 EXTREME LATE: ${lateMinutes} minutes - Action Required`;
      body = `You were ${lateMinutes} minutes late for your shift at ${shiftTime} (${totalLateMinutes} min total). This is a serious violation. ${warningMessage} Please provide justification within ${this.JUSTIFICATION_DEADLINE_HOURS} hours.`;
    } else if (lateMinutes > 30) {
      title = `⚠️ Late Clock-In Alert - ${lateMinutes} minutes`;
      body = `You were ${lateMinutes} minutes late for your shift at ${shiftTime}. ${warningMessage} This is late #${monthlyCount} this month.`;
    } else if (monthlyCount >= 3) {
      title = `⚠️ Late Clock-In Warning #${monthlyCount}`;
      body = `You were ${lateMinutes} minutes late for your shift at ${shiftTime}. ${warningMessage} This is your ${monthlyCount}${this.getOrdinalSuffix(monthlyCount)} late this month.`;
    } else {
      title = `Late Clock-In: ${lateMinutes} minutes`;
      body = `You were ${lateMinutes} minutes late for your shift at ${shiftTime}. ${warningMessage}`;
    }

    // Add policy reminder for repeated offenses
    if (monthlyCount >= 2) {
      body += ` Please review company attendance policy.`;
    }

    // Actions based on severity
    const actions = [
      {
        label: 'View Attendance',
        url: viewUrl,
      },
    ];

    // Add justify action if needed
    if (this.shouldRequireJustification(lateMinutes, monthlyCount - 1, exceedsMonthlyLimit)) {
      actions.unshift({
        label: 'Justify Lateness',
        url: justifyUrl,
      });
    }

    // Add policy link for critical cases
    if (exceedsMonthlyLimit || lateMinutes > 60) {
      actions.push({
        label: 'View Policy',
        url: policyUrl,
      });
    }

    return { title, body, actions };
  }

  private generateWarningMessage(lateMinutes: number, monthlyCount: number): string {
    if (lateMinutes <= 15) {
      return 'Please try to be on time.';
    } else if (lateMinutes <= 30) {
      return 'This will be marked in your attendance record.';
    } else if (lateMinutes <= 60) {
      return 'Significant lateness detected. Please provide a reason.';
    } else {
      return 'Extreme lateness detected. HR has been notified.';
    }
  }

  private shouldRequireJustification(
    lateMinutes: number,
    monthlyLateCount: number,
    exceedsMonthlyLimit: boolean,
  ): boolean {
    // Require justification if:
    // 1. Very late (> 30 minutes)
    // 2. Exceeds monthly limit
    // 3. Third late in a month
    // 4. Second late in a month with >15 min
    return (
      lateMinutes > 30 ||
      exceedsMonthlyLimit ||
      monthlyLateCount >= this.ALLOWED_LATE_COUNT_PER_MONTH - 1 ||
      (monthlyLateCount >= 1 && lateMinutes > 15)
    );
  }

  private getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  private async getMonthlyLateCount(userId: string, date: Date): Promise<number> {
    // TODO: Implement actual database query
    // This should query attendance records with status = ATTENDANCE_STATUS.LATE
    // for the current month
    
    // const { start, end } = this.timeUtils.getDateRange(month, year);
    // return await this.attendanceRepository.count({
    //   where: {
    //     userId,
    //     date: Between(start, end),
    //     status: ATTENDANCE_STATUS.LATE
    //   }
    // });
    
    // Placeholder - replace with actual DB query
    return 0;
  }

  // Public helper methods for other services
  async getEmployeeLateStats(
    tenantId: string,
    userId: string,
    date: Date = new Date(),
  ): Promise<{
    currentMonthLateCount: number;
    remainingAllowedLates: number;
    totalLateMinutesThisMonth: number;
    averageLateMinutes: number;
    lastLateDate: Date | null;
  }> {
    const lateCount = await this.getMonthlyLateCount(userId, date);
    
    return {
      currentMonthLateCount: lateCount,
      remainingAllowedLates: Math.max(0, this.ALLOWED_LATE_COUNT_PER_MONTH - lateCount),
      totalLateMinutesThisMonth: lateCount * 10, // TODO: Calculate from actual records
      averageLateMinutes: 10, // TODO: Calculate from actual records
      lastLateDate: null, // TODO: Get from actual records
    };
  }

  shouldNotifyForLate(lateMinutes: number, gracePeriod: number = this.GRACE_PERIOD_MINUTES): boolean {
    return lateMinutes > gracePeriod;
  }

  getLateCategory(lateMinutes: number): 'minor' | 'moderate' | 'severe' | 'critical' {
    if (lateMinutes <= 15) return 'minor';
    if (lateMinutes <= 30) return 'moderate';
    if (lateMinutes <= 60) return 'severe';
    return 'critical';
  }
}