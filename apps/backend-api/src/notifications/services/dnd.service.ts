import { Injectable, Logger } from '@nestjs/common';

/**
 * Imported from local types file
 */
import {
  NotificationChannel,
  NotificationPriority,
  DND_START_HOUR,
  DND_END_HOUR,
  DND_CHANNELS,
  UserNotificationSettings,
} from '../types/notification.types';

@Injectable()
export class DndService {
  private readonly logger = new Logger(DndService.name);

  // Using the interface from the imported types
  userSettings: UserNotificationSettings = {
    userId: '',
    tenantId: '',
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '07:00',
    digestEnabled: false,
    digestFrequency: 'DAILY',
    emailDigest: false,
    pushDigest: false,
  };

  /**
   * Returns true if a notification should be blocked by DND rules.
   * SMS and WHATSAPP are blocked between DND_START_HOUR and DND_END_HOUR
   * unless the notification is HIGH priority.
   */
  isBlocked(channel: NotificationChannel, priority: NotificationPriority): boolean {
    // 1. Allow if priority is HIGH (override DND)
    if (priority === NotificationPriority.HIGH) return false;

    // 2. Use the configured DND_CHANNELS set to check if the channel is sensitive
    if (!DND_CHANNELS.has(channel)) return false;

    // 3. Check time
    const hour = new Date().getHours();

    // Logic for crossing midnight (e.g., 22:00 to 07:00)
    const isDnd =
      DND_START_HOUR > DND_END_HOUR
        ? hour >= DND_START_HOUR || hour < DND_END_HOUR   // e.g. 22:00 → 07:00
        : hour >= DND_START_HOUR && hour < DND_END_HOUR; // e.g. 23:00 → 02:00

    if (isDnd) {
      this.logger.debug(
        `DND active — blocking ${channel} notification (priority: ${priority})`,
      );
    }

    return isDnd;
  }

  /**
   * Filters a list of channels removing any blocked by DND.
   */
  filterChannels(
    channels: NotificationChannel[],
    priority: NotificationPriority,
  ): NotificationChannel[] {
    return channels.filter((c) => !this.isBlocked(c, priority));
  }
}