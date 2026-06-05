import { Injectable } from '@nestjs/common';
import {
  NotificationTriggerEvent,
  NotificationChannel,
  RenderedNotification,
  NotificationAction,
} from '../types/notification.types';

type TemplateRenderer = (data: Record<string, any>) => RenderedNotification;
type ChannelTemplates = Partial<Record<NotificationChannel, TemplateRenderer>>;
type TemplateMap = Partial<Record<NotificationTriggerEvent, ChannelTemplates>>;

const actions = {
  fixTimecard: (date = 'today'): NotificationAction => ({
    label: 'Fix Timecard',
    url: `/timecard/${date}`,
  }),
  justify: (id: string): NotificationAction => ({
    label: 'Justify',
    url: `/justify/${id}`,
  }),
  viewTimesheet: (): NotificationAction => ({
    label: 'View Timesheet',
    url: '/timesheet',
  }),
  viewRoster: (): NotificationAction => ({
    label: 'View Roster',
    url: '/roster',
  }),
  dismiss: (): NotificationAction => ({
    label: 'Dismiss',
    action: 'dismiss',
  }),
};

@Injectable()
export class RendererService {
  private readonly templates: TemplateMap = {

    // ── LATE_IN ──────────────────────────────────────────────────────────────
    [NotificationTriggerEvent.LATE_IN]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '⏰ Late Clock-In Recorded',
        body: `You clocked in ${d.lateMinutes} minute(s) late on ${d.date}.`,
        actions: [actions.justify(d.summaryId), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Late Clock-In Notification',
        body: `Dear ${d.firstName},\n\nYour clock-in on ${d.date} was recorded ${d.lateMinutes} minute(s) late (scheduled: ${d.scheduledStart}).\n\nIf this was due to an extenuating circumstance, please contact your department head.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Late Clock-In',
        body: `Chronos: You clocked in ${d.lateMinutes} min late on ${d.date}. Log in to justify: ${d.portalUrl}`,
        actions: [],
      }),
    },

    // ── EARLY_OUT ────────────────────────────────────────────────────────────
    [NotificationTriggerEvent.EARLY_OUT]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '⚠️ Early Clock-Out Detected',
        body: `You clocked out ${d.earlyMinutes} minute(s) before your shift ended on ${d.date}.`,
        actions: [actions.fixTimecard(d.date), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Early Clock-Out Notification',
        body: `Dear ${d.firstName},\n\nAn early clock-out of ${d.earlyMinutes} minute(s) was recorded on ${d.date} (scheduled end: ${d.scheduledEnd}).\n\nPlease ensure this is accurate for payroll purposes.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Early Clock-Out',
        body: `Chronos: Early clock-out of ${d.earlyMinutes} min on ${d.date}. Contact HR if incorrect.`,
        actions: [],
      }),
    },

    // ── MISSED_PUNCH ─────────────────────────────────────────────────────────
    [NotificationTriggerEvent.MISSED_PUNCH]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '⚠️ Missed Clock-Out Detected',
        body: `You clocked in at ${d.clockIn} on ${d.date} but have not clocked out. Please correct this to ensure accurate payroll.`,
        actions: [actions.fixTimecard(d.date), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: '⚠️ Missed Punch — Action Required',
        body: `Dear ${d.firstName},\n\nA missing ${d.direction} punch was detected on ${d.date}.\n\nYou clocked in at ${d.clockIn} but no clock-out has been recorded. Please fix your timecard immediately to avoid payroll discrepancies.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Missed Punch',
        body: `Chronos URGENT: Missing clock-out on ${d.date}. Fix your timecard now: ${d.portalUrl}`,
        actions: [],
      }),
    },

    // ── MISSED_BREAK ─────────────────────────────────────────────────────────
    [NotificationTriggerEvent.MISSED_BREAK]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: 'Missed Break Recorded',
        body: `You worked ${d.hoursWorked} hours on ${d.date} without a break. This has been flagged.`,
        actions: [actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Missed Break Notification',
        body: `Dear ${d.firstName},\n\nOur records show you worked ${d.hoursWorked} hours on ${d.date} without a scheduled break.\n\nPlease ensure you take your mandated breaks for health and compliance.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── OVERTIME_APPROACHING ─────────────────────────────────────────────────
    [NotificationTriggerEvent.OVERTIME_APPROACHING]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '📊 Overtime Alert',
        body: `You have worked ${d.hoursThisWeek} hours this week. ${d.remainingHours} hour(s) remaining before overtime rate applies.`,
        actions: [actions.viewTimesheet(), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Overtime Approaching — Manager Alert',
        body: `Dear ${d.managerName},\n\n${d.firstName} ${d.lastName} has worked ${d.hoursThisWeek} hours this week and is approaching the ${d.overtimeThreshold}-hour overtime threshold.\n\nRemaining: ${d.remainingHours} hour(s).\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── OVERTIME_RECORDED ────────────────────────────────────────────────────
    [NotificationTriggerEvent.OVERTIME_RECORDED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: 'Overtime Hours Recorded',
        body: `${d.overtimeHours} overtime hour(s) recorded on ${d.date}. This will be reflected in payroll.`,
        actions: [actions.viewTimesheet(), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Overtime Hours Notification',
        body: `Dear ${d.firstName},\n\nYou worked ${d.overtimeHours} overtime hour(s) on ${d.date}.\n\nThis has been recorded and will be processed in your next payroll cycle.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── LEAVE_REQUEST_CREATED ────────────────────────────────────────────────
    [NotificationTriggerEvent.LEAVE_REQUEST_CREATED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: 'New Leave Request',
        body: `${d.firstName} ${d.lastName} has submitted a leave request from ${d.startDate} to ${d.endDate}.`,
        actions: [
          { label: 'Review', url: `/leave/requests/${d.requestId}` },
          actions.dismiss(),
        ],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: `Leave Request from ${d.firstName} ${d.lastName}`,
        body: `Dear ${d.managerName},\n\n${d.firstName} ${d.lastName} has submitted a leave request:\n\n• Period: ${d.startDate} to ${d.endDate}\n• Type: ${d.leaveType}\n• Reason: ${d.reason}\n\nPlease review and respond at your earliest convenience.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── LEAVE_REQUEST_APPROVED ───────────────────────────────────────────────
    [NotificationTriggerEvent.LEAVE_REQUEST_APPROVED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '✅ Leave Request Approved',
        body: `Your leave from ${d.startDate} to ${d.endDate} has been approved by ${d.approverName}.`,
        actions: [actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Your Leave Request Has Been Approved',
        body: `Dear ${d.firstName},\n\nYour leave request from ${d.startDate} to ${d.endDate} has been approved by ${d.approverName}.\n\nHave a restful time. Please ensure your tasks are handed over before your leave begins.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Leave Approved',
        body: `Chronos: Your leave ${d.startDate}–${d.endDate} is approved. Enjoy your time off!`,
        actions: [],
      }),
    },

    // ── LEAVE_REQUEST_REJECTED ───────────────────────────────────────────────
    [NotificationTriggerEvent.LEAVE_REQUEST_REJECTED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '❌ Leave Request Rejected',
        body: `Your leave request from ${d.startDate} to ${d.endDate} was rejected. Reason: ${d.reason}.`,
        actions: [{ label: 'View Details', url: `/leave/requests/${d.requestId}` }, actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Leave Request Not Approved',
        body: `Dear ${d.firstName},\n\nUnfortunately your leave request from ${d.startDate} to ${d.endDate} has not been approved.\n\nReason: ${d.reason}\n\nPlease speak to your manager if you need clarification or wish to resubmit.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Leave Rejected',
        body: `Chronos: Your leave ${d.startDate}–${d.endDate} was not approved. Reason: ${d.reason}.`,
        actions: [],
      }),
    },

    // ── SHIFT_ASSIGNED ───────────────────────────────────────────────────────
    [NotificationTriggerEvent.SHIFT_ASSIGNED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '📅 New Shift Assigned',
        body: `You have been assigned to ${d.shiftName} starting ${d.startDate}.`,
        actions: [actions.viewRoster(), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'New Shift Assignment',
        body: `Dear ${d.firstName},\n\nYou have been assigned to the ${d.shiftName} shift:\n\n• Start Date: ${d.startDate}\n• Hours: ${d.startTime} – ${d.endTime}\n• Department: ${d.department}\n\nPlease review your updated roster on the Chronos portal.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Shift Assigned',
        body: `Chronos: New shift ${d.shiftName} from ${d.startDate} (${d.startTime}–${d.endTime}). Check portal.`,
        actions: [],
      }),
    },

    // ── SHIFT_CHANGED ────────────────────────────────────────────────────────
    [NotificationTriggerEvent.SHIFT_CHANGED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '🔄 Shift Updated',
        body: `Your shift has been changed from ${d.oldShift} to ${d.newShift}, effective ${d.effectiveDate}.`,
        actions: [actions.viewRoster(), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Shift Change Notification',
        body: `Dear ${d.firstName},\n\nYour shift has been updated:\n\n• Previous: ${d.oldShift}\n• New: ${d.newShift}\n• Effective: ${d.effectiveDate}\n\nPlease review your updated schedule on the portal.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Shift Changed',
        body: `Chronos: Your shift changed to ${d.newShift} from ${d.effectiveDate}. Check portal.`,
        actions: [],
      }),
    },

    // ── TIMECARD_EDITED ──────────────────────────────────────────────────────
    [NotificationTriggerEvent.TIMECARD_EDITED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '✏️ Your Timecard Was Edited',
        body: `Your timecard for ${d.date} was modified by ${d.editorName}. Please review the changes.`,
        actions: [actions.fixTimecard(d.date), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Timecard Edit Notification',
        body: `Dear ${d.firstName},\n\nYour timecard for ${d.date} has been edited by ${d.editorName}.\n\nChanges:\n• Previous: ${d.oldValue}\n• Updated: ${d.newValue}\n\nIf you believe this is incorrect, please contact HR immediately.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
      [NotificationChannel.SMS]: (d) => ({
        title: 'Timecard Edited',
        body: `Chronos: Your timecard for ${d.date} was edited by ${d.editorName}. Review: ${d.portalUrl}`,
        actions: [],
      }),
    },

    // ── SCHEDULE_POSTED ──────────────────────────────────────────────────────
    [NotificationTriggerEvent.SCHEDULE_POSTED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '📋 New Schedule Published',
        body: `Your schedule for the week of ${d.weekStart} has been published.`,
        actions: [actions.viewRoster(), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Weekly Schedule Published',
        body: `Dear ${d.firstName},\n\nYour work schedule for the week of ${d.weekStart} has been published on Chronos.\n\nPlease log in to review your shifts and plan accordingly.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── CLOCK_IN_REMINDER ────────────────────────────────────────────────────
    [NotificationTriggerEvent.CLOCK_IN_REMINDER]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '🔔 Clock-In Reminder',
        body: `Your shift started at ${d.scheduledStart}. You have not clocked in yet.`,
        actions: [actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Clock-In Reminder',
        body: `Dear ${d.firstName},\n\nThis is a reminder that your shift started at ${d.scheduledStart} and we have not recorded your clock-in.\n\nPlease clock in as soon as possible.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── UNSUBMITTED_TIMESHEET ────────────────────────────────────────────────
    [NotificationTriggerEvent.UNSUBMITTED_TIMESHEET]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '⏳ Timesheet Not Submitted',
        body: `Your timesheet for the pay period ending ${d.periodEnd} has not been submitted.`,
        actions: [actions.viewTimesheet(), actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'Unsubmitted Timesheet Reminder',
        body: `Dear ${d.firstName},\n\nThe pay period ending ${d.periodEnd} is closing soon and your timesheet has not been submitted.\n\nPlease submit your timesheet to avoid payroll delays.\n\nRegards,\nChronos HR`,
        actions: [],
      }),
    },

    // ── INTEGRATION_FAILED ───────────────────────────────────────────────────
    [NotificationTriggerEvent.INTEGRATION_FAILED]: {
      [NotificationChannel.IN_APP]: (d) => ({
        title: '🔴 Integration Failure',
        body: `Clock-in data sync failed for ${d.affectedCount} record(s). Manual review required.`,
        actions: [{ label: 'View Errors', url: '/admin/integrations/errors' }, actions.dismiss()],
      }),
      [NotificationChannel.EMAIL]: (d) => ({
        title: 'URGENT: Payroll Integration Failure',
        body: `Dear ${d.adminName},\n\nA critical integration failure occurred:\n\n• System: ${d.system}\n• Affected Records: ${d.affectedCount}\n• Time: ${d.failedAt}\n• Error: ${d.errorMessage}\n\nImmediate action is required to prevent payroll discrepancies.\n\nRegards,\nChronos System`,
        actions: [],
      }),
    },
  };

  render(
    event: NotificationTriggerEvent,
    channel: NotificationChannel,
    data: Record<string, any>,
  ): RenderedNotification {
    const eventTemplates = this.templates[event];
    if (!eventTemplates) {
      return { title: String(event), body: JSON.stringify(data), actions: [] };
    }

    const renderer = eventTemplates[channel] ?? eventTemplates[NotificationChannel.IN_APP];
    if (!renderer) {
      return { title: String(event), body: JSON.stringify(data), actions: [] };
    }

    return renderer(data);
  }
}