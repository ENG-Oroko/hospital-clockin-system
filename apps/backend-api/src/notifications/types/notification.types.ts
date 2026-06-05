import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTriggerEvent,
} from '@chronos/database';

// Re-export Prisma enums so the rest of the module imports from one place
export {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationTriggerEvent,
};

// ── Priority → default channels ───────────────────────────────────────────────
export const PRIORITY_CHANNEL_RULES: Record<NotificationPriority, NotificationChannel[]> = {
  [NotificationPriority.HIGH]: [
    NotificationChannel.IN_APP,
    NotificationChannel.EMAIL,
    NotificationChannel.SMS,
  ],
  [NotificationPriority.MEDIUM]: [
    NotificationChannel.IN_APP,
    NotificationChannel.EMAIL,
  ],
  [NotificationPriority.LOW]: [
    NotificationChannel.IN_APP,
  ],
};

// ── Event → priority ──────────────────────────────────────────────────────────
export const EVENT_PRIORITY_MAP: Record<NotificationTriggerEvent, NotificationPriority> = {
  [NotificationTriggerEvent.MISSED_PUNCH]:          NotificationPriority.HIGH,
  [NotificationTriggerEvent.LATE_IN]:               NotificationPriority.HIGH,
  [NotificationTriggerEvent.EARLY_OUT]:             NotificationPriority.HIGH,
  [NotificationTriggerEvent.OVERTIME_APPROACHING]:  NotificationPriority.HIGH,
  [NotificationTriggerEvent.TIMECARD_EDITED]:       NotificationPriority.HIGH,
  [NotificationTriggerEvent.INTEGRATION_FAILED]:    NotificationPriority.HIGH,
  [NotificationTriggerEvent.LEAVE_REQUEST_CREATED]: NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.LEAVE_REQUEST_APPROVED]:NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.LEAVE_REQUEST_REJECTED]:NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.SHIFT_ASSIGNED]:        NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.SHIFT_CHANGED]:         NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.MISSED_BREAK]:          NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.OVERTIME_RECORDED]:     NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.SCHEDULE_POSTED]:       NotificationPriority.LOW,
  [NotificationTriggerEvent.CLOCK_IN_REMINDER]:     NotificationPriority.LOW,
  [NotificationTriggerEvent.UNSUBMITTED_TIMESHEET]: NotificationPriority.LOW,
  [NotificationTriggerEvent.CLOCK_IN]:              NotificationPriority.LOW,
  [NotificationTriggerEvent.CLOCK_OUT]:             NotificationPriority.LOW,
  [NotificationTriggerEvent.SHIFT_SWAP_REQUESTED]:  NotificationPriority.MEDIUM,
  [NotificationTriggerEvent.OPEN_SHIFT_BID]:        NotificationPriority.MEDIUM,
};

// ── Events users cannot opt out of ───────────────────────────────────────────
export const MANDATORY_EVENTS = new Set<NotificationTriggerEvent>([
  NotificationTriggerEvent.MISSED_PUNCH,
  NotificationTriggerEvent.TIMECARD_EDITED,
  NotificationTriggerEvent.INTEGRATION_FAILED,
]);

// ── DND configuration ─────────────────────────────────────────────────────────
export const DND_START_HOUR = 22; // 10 PM
export const DND_END_HOUR   = 7;  // 7 AM
export const DND_CHANNELS   = new Set<NotificationChannel>([
  NotificationChannel.SMS,
  NotificationChannel.WHATSAPP,
]);

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
}

export interface NotificationPayload {
  tenantId: string;
  userId: string;
  event: NotificationTriggerEvent;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  recipient: string;
  data: Record<string, any>;
  actions?: NotificationAction[];
  expiresInMinutes?: number;
}

export interface RenderedNotification {
  title: string;
  body: string;
  actions?: NotificationAction[];
}

export interface DispatchResult {
  success: boolean;
  channel: NotificationChannel;
  notificationId?: string;
  error?: string;
}

export interface NotificationPreference {
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  event: NotificationTriggerEvent;
  enabled: boolean;
  mandatory?: boolean;
}

export interface UserNotificationSettings {
  userId: string;
  tenantId: string;
  dndEnabled: boolean;
  dndStart: string;  // HH:mm
  dndEnd: string;    // HH:mm
  digestEnabled: boolean;
  digestFrequency: 'DAILY' | 'WEEKLY';
  emailDigest: boolean;
  pushDigest: boolean;
}

export interface DigestItem {
  title: string;
  body: string;
  event: NotificationTriggerEvent;
  createdAt: Date;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationTriggerEvent;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
}

export interface BroadcastPayload {
  title: string;
  body: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  triggerEvent?: NotificationTriggerEvent;
}