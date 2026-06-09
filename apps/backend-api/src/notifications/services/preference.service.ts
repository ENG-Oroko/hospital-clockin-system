import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  NotificationChannel,
  NotificationTriggerEvent,
  NotificationPreference,
  MANDATORY_EVENTS,
  PRIORITY_CHANNEL_RULES,
  NotificationPriority,
  EVENT_PRIORITY_MAP,
} from '../types/notification.types';

// In-memory fallback store — supplements DB preferences
const preferenceStore = new Map<string, NotificationPreference>();

// Helper: EVENT_PRIORITY_MAP is a plain Record, not a Map — use `in` operator
function getEventPriority(event: NotificationTriggerEvent): NotificationPriority {
  return event in EVENT_PRIORITY_MAP
    ? EVENT_PRIORITY_MAP[event]
    : NotificationPriority.MEDIUM;
}

// Helper: read a field from the UserSettings `preferences` JSON blob safely
function getPrefsField<T>(preferences: any, field: string, fallback: T): T {
  if (!preferences || typeof preferences !== 'object') return fallback;
  return field in preferences ? (preferences as any)[field] : fallback;
}

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  constructor(private readonly db: PrismaService) {}

  private key(userId: string, event: NotificationTriggerEvent, channel: NotificationChannel) {
    return `${userId}:${event}:${channel}`;
  }

  // ─── Enabled channels ──────────────────────────────────────────────────────

  async getEnabledChannels(
    tenantId: string,
    userId: string,
    event: NotificationTriggerEvent,
  ): Promise<NotificationChannel[]> {
    const priority = getEventPriority(event);
    const defaultChannels = PRIORITY_CHANNEL_RULES[priority];

    const dbPreferences = await this.db.notificationPreference.findMany({
      where: { tenantId, userId, event },
    });

    const prefMap = new Map<string, boolean>();
    dbPreferences.forEach(p => prefMap.set(p.channel, p.enabled));

    return defaultChannels.filter((channel) => {
      if (MANDATORY_EVENTS.has(event)) return true;
      return prefMap.has(channel)
        ? prefMap.get(channel)
        : preferenceStore.get(this.key(userId, event, channel))?.enabled ?? true;
    });
  }

  // ─── Update single preference ──────────────────────────────────────────────

  async updatePreference(
    tenantId: string,
    userId: string,
    event: NotificationTriggerEvent,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<NotificationPreference> {
    if (MANDATORY_EVENTS.has(event) && !enabled) {
      throw new BadRequestException(`Notifications for "${event}" are mandatory and cannot be disabled.`);
    }

    const dbPreference = await this.db.notificationPreference.upsert({
      where: { tenantId_userId_event_channel: { tenantId, userId, event, channel } },
      update: { enabled },
      create: { tenantId, userId, event, channel, enabled },
    });

    const pref: NotificationPreference = {
      tenantId, userId, event, channel, enabled, mandatory: MANDATORY_EVENTS.has(event),
    };
    preferenceStore.set(this.key(userId, event, channel), pref);
    this.logger.debug(`Preference updated: ${userId} | ${event} | ${channel} = ${enabled}`);
    return dbPreference as any;
  }

  // ─── Get all preferences ───────────────────────────────────────────────────

  async getAll(tenantId: string, userId: string): Promise<NotificationPreference[]> {
    const dbPreferences = await this.db.notificationPreference.findMany({ where: { tenantId, userId } });
    const dbPrefMap = new Map(dbPreferences.map(p => [`${p.event}:${p.channel}`, p]));
    const result: NotificationPreference[] = [];

    for (const event of Object.values(NotificationTriggerEvent)) {
      const priority = getEventPriority(event as NotificationTriggerEvent);
      for (const channel of PRIORITY_CHANNEL_RULES[priority]) {
        const dbPref = dbPrefMap.get(`${event}:${channel}`);
        const stored = preferenceStore.get(this.key(userId, event as NotificationTriggerEvent, channel));
        result.push({
          tenantId, userId,
          event: event as NotificationTriggerEvent,
          channel,
          enabled: dbPref ? dbPref.enabled : (stored?.enabled ?? true),
          mandatory: MANDATORY_EVENTS.has(event as NotificationTriggerEvent),
        } as NotificationPreference);
      }
    }
    return result;
  }

  async getSummary(tenantId: string, userId: string) {
    const preferences = await this.getAll(tenantId, userId);
    const settings = await this.getUserSettings(tenantId, userId);
    const byEvent = preferences.reduce((acc, p) => {
      if (!acc[p.event]) acc[p.event] = { event: p.event, mandatory: p.mandatory, channels: {} };
      acc[p.event].channels[p.channel] = p.enabled;
      return acc;
    }, {} as Record<string, any>);
    const total = preferences.length;
    const enabled = preferences.filter(p => p.enabled).length;
    return { 
      summary: { 
        totalPreferences: total, 
        enabledCount: enabled, 
        disabledCount: total - enabled, 
        enabledPercentage: total > 0 ? (enabled / total) * 100 : 0 
      }, 
      byEvent: Object.values(byEvent), 
      settings 
    };
  }

  async bulkUpdate(tenantId: string, userId: string, preferences: Array<{ event: NotificationTriggerEvent; channel: NotificationChannel; enabled: boolean }>): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];
    for (const p of preferences) {
      results.push(await this.updatePreference(tenantId, userId, p.event, p.channel, p.enabled));
    }
    this.logger.log(`Bulk updated ${results.length} preferences for user ${userId}`);
    return results;
  }

  async resetToDefault(tenantId: string, userId: string): Promise<number> {
    const deleted = await this.db.notificationPreference.deleteMany({ where: { tenantId, userId } });
    for (const event of Object.values(NotificationTriggerEvent)) {
      for (const channel of Object.values(NotificationChannel)) {
        preferenceStore.delete(this.key(userId, event as NotificationTriggerEvent, channel as NotificationChannel));
      }
    }
    this.logger.log(`Reset preferences for user ${userId}, deleted ${deleted.count} records`);
    return deleted.count;
  }

  // ─── User settings using UserNotificationSettings model ───────────────────

  private async findSettings(tenantId: string, userId: string) {
    return this.db.userNotificationSettings.findFirst({
      where: { tenantId, userId }
    });
  }

  async getUserSettings(tenantId: string, userId: string) {
    const settings = await this.findSettings(tenantId, userId);
    
    if (!settings) {
      // Return default settings
      return {
        userId,
        tenantId,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        digestEnabled: true,
        digestFrequency: 'daily',
        emailDigest: true,
        pushDigest: false,
        smsEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        timezone: 'UTC',
        language: 'en',
        dndEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    return {
      userId: settings.userId,
      tenantId: settings.tenantId,
      quietHoursEnabled: settings.quietHoursEnabled,
      quietHoursStart: settings.quietHoursStart || '22:00',
      quietHoursEnd: settings.quietHoursEnd || '07:00',
      digestEnabled: settings.digestEnabled,
      digestFrequency: settings.digestFrequency || 'daily',
      emailDigest: settings.emailDigest,
      pushDigest: settings.pushDigest,
      smsEnabled: settings.smsEnabled,
      emailEnabled: settings.emailEnabled,
      inAppEnabled: settings.inAppEnabled,
      timezone: settings.timezone || 'UTC',
      language: settings.language || 'en',
      dndEnabled: false, // You might want to add this field to your schema
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async updateUserSettings(tenantId: string, userId: string, dto: Record<string, any>) {
    // Ensure settings exist
    await this.ensureUserSettings(tenantId, userId);
    
    // Update only the fields that are provided
    const updated = await this.db.userNotificationSettings.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: {
        quietHoursEnabled: dto.quietHoursEnabled !== undefined ? dto.quietHoursEnabled : undefined,
        quietHoursStart: dto.quietHoursStart !== undefined ? dto.quietHoursStart : undefined,
        quietHoursEnd: dto.quietHoursEnd !== undefined ? dto.quietHoursEnd : undefined,
        digestEnabled: dto.digestEnabled !== undefined ? dto.digestEnabled : undefined,
        digestFrequency: dto.digestFrequency !== undefined ? dto.digestFrequency : undefined,
        emailDigest: dto.emailDigest !== undefined ? dto.emailDigest : undefined,
        pushDigest: dto.pushDigest !== undefined ? dto.pushDigest : undefined,
        smsEnabled: dto.smsEnabled !== undefined ? dto.smsEnabled : undefined,
        emailEnabled: dto.emailEnabled !== undefined ? dto.emailEnabled : undefined,
        inAppEnabled: dto.inAppEnabled !== undefined ? dto.inAppEnabled : undefined,
        timezone: dto.timezone !== undefined ? dto.timezone : undefined,
        language: dto.language !== undefined ? dto.language : undefined,
      },
    });
    
    this.logger.log(`Updated user settings for ${userId}`);
    return updated;
  }

  async getQuietHours(tenantId: string, userId: string): Promise<{ enabled: boolean; start: string; end: string }> {
    const settings = await this.findSettings(tenantId, userId);
    
    if (!settings) {
      return {
        enabled: false,
        start: '22:00',
        end: '07:00',
      };
    }
    
    return {
      enabled: settings.quietHoursEnabled,
      start: settings.quietHoursStart || '22:00',
      end: settings.quietHoursEnd || '07:00',
    };
  }

  async updateQuietHours(tenantId: string, userId: string, dto: { enabled: boolean; start: string; end: string }): Promise<void> {
    await this.ensureUserSettings(tenantId, userId);
    
    await this.db.userNotificationSettings.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: {
        quietHoursEnabled: dto.enabled,
        quietHoursStart: dto.start,
        quietHoursEnd: dto.end,
      },
    });
    
    this.logger.log(`Updated quiet hours for ${userId}: enabled=${dto.enabled}`);
  }

  async shouldSendNow(tenantId: string, userId: string, priority: NotificationPriority): Promise<boolean> {
    if (priority === NotificationPriority.HIGH) return true;
    
    const qh = await this.getQuietHours(tenantId, userId);
    if (!qh.enabled) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    const [startHour] = qh.start.split(':').map(Number);
    const [endHour] = qh.end.split(':').map(Number);
    
    if (startHour > endHour) {
      // Quiet hours cross midnight
      return !(currentHour >= startHour || currentHour < endHour);
    } else {
      return !(currentHour >= startHour && currentHour < endHour);
    }
  }

  async getDigestEnabled(tenantId: string, userId: string): Promise<boolean> {
    const settings = await this.findSettings(tenantId, userId);
    return settings?.digestEnabled ?? true;
  }

  async updateDigestEnabled(tenantId: string, userId: string, enabled: boolean): Promise<void> {
    await this.ensureUserSettings(tenantId, userId);
    
    await this.db.userNotificationSettings.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: {
        digestEnabled: enabled,
      },
    });
  }

  async getUsersWithDigestEnabled(): Promise<Array<{ tenantId: string; userId: string }>> {
    const settings = await this.db.userNotificationSettings.findMany({
      where: {
        digestEnabled: true,
      },
      select: {
        tenantId: true,
        userId: true,
      },
    });
    
    return settings;
  }

  async getPreferenceByEvent(tenantId: string, userId: string, event: NotificationTriggerEvent): Promise<NotificationPreference[]> {
    const dbPreferences = await this.db.notificationPreference.findMany({
      where: { tenantId, userId, event },
    });
    
    if (dbPreferences.length > 0) {
      return dbPreferences as any;
    }
    
    const priority = getEventPriority(event);
    return PRIORITY_CHANNEL_RULES[priority].map(channel => ({
      tenantId,
      userId,
      event,
      channel,
      enabled: true,
      mandatory: MANDATORY_EVENTS.has(event)
    } as NotificationPreference));
  }

  async validateChannelForEvent(tenantId: string, userId: string, event: NotificationTriggerEvent, channel: NotificationChannel): Promise<boolean> {
    const priority = getEventPriority(event);
    return PRIORITY_CHANNEL_RULES[priority].includes(channel);
  }

  async getChannelPreferences(
    tenantId: string,
    userId: string
  ): Promise<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    inAppEnabled: boolean;
  }> {
    const settings = await this.findSettings(tenantId, userId);
    
    if (!settings) {
      return {
        smsEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
      };
    }
    
    return {
      smsEnabled: settings.smsEnabled,
      emailEnabled: settings.emailEnabled,
      inAppEnabled: settings.inAppEnabled,
    };
  }

  async updateChannelPreferences(
    tenantId: string,
    userId: string,
    updates: {
      smsEnabled?: boolean;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
    }
  ): Promise<void> {
    await this.ensureUserSettings(tenantId, userId);
    
    await this.db.userNotificationSettings.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      data: {
        smsEnabled: updates.smsEnabled,
        emailEnabled: updates.emailEnabled,
        inAppEnabled: updates.inAppEnabled,
      },
    });
    
    this.logger.log(`Updated channel preferences for ${userId}`);
  }

  private async ensureUserSettings(tenantId: string, userId: string): Promise<void> {
    const existing = await this.findSettings(tenantId, userId);
    
    if (!existing) {
      await this.db.userNotificationSettings.create({
        data: {
          tenantId,
          userId,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          digestEnabled: true,
          digestFrequency: 'daily',
          emailDigest: true,
          pushDigest: false,
          smsEnabled: true,
          emailEnabled: true,
          inAppEnabled: true,
          timezone: 'UTC',
          language: 'en',
        },
      });
      
      this.logger.log(`Created default user settings for ${userId} in tenant ${tenantId}`);
    }
  }
}