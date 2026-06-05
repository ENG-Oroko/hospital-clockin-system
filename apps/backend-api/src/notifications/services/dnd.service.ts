import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationPriority,
  DND_START_HOUR,
  DND_END_HOUR,
} from '../types/notification.types';

@Injectable()
export class DndService {
  private readonly logger = new Logger(DndService.name);

  /**
   * Returns true if a notification should be blocked by DND rules.
   * SMS and WHATSAPP are blocked between DND_START_HOUR and DND_END_HOUR
   * unless the notification is HIGH priority.
   */
  isBlocked(channel: NotificationChannel, priority: NotificationPriority): boolean {
    if (priority === NotificationPriority.HIGH) return false;

    const sensitiveChannels = [NotificationChannel.SMS, NotificationChannel.WHATSAPP];
    if (!sensitiveChannels.includes(channel)) return false;

    const hour = new Date().getHours();
    const isDnd =
      DND_START_HOUR > DND_END_HOUR
        ? hour >= DND_START_HOUR || hour < DND_END_HOUR   // e.g. 22:00 → 07:00
        : hour >= DND_START_HOUR && hour < DND_END_HOUR;

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