import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export class CreateUserNotificationSettingsDto {
  tenantId: string;
  userId: string;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestEnabled?: boolean;
  digestFrequency?: string;
  emailDigest?: boolean;
  pushDigest?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  timezone?: string;
  language?: string;
}

export class UpdateUserNotificationSettingsDto {
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestEnabled?: boolean;
  digestFrequency?: string;
  emailDigest?: boolean;
  pushDigest?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  timezone?: string;
  language?: string;
}

export class UserNotificationSettingsResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestEnabled: boolean;
  digestFrequency: string;
  emailDigest: boolean;
  pushDigest: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  timezone: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.tenantId = data.tenantId;
    this.userId = data.userId;
    this.quietHoursEnabled = data.quietHoursEnabled;
    this.quietHoursStart = data.quietHoursStart || '22:00';
    this.quietHoursEnd = data.quietHoursEnd || '07:00';
    this.digestEnabled = data.digestEnabled;
    this.digestFrequency = data.digestFrequency || 'daily';
    this.emailDigest = data.emailDigest;
    this.pushDigest = data.pushDigest;
    this.smsEnabled = data.smsEnabled;
    this.emailEnabled = data.emailEnabled;
    this.inAppEnabled = data.inAppEnabled;
    this.timezone = data.timezone || 'UTC';
    this.language = data.language || 'en';
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

@Injectable()
export class UserNotificationSettingsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<UserNotificationSettingsResponseDto | null> {
    const settings = await this.prisma.userNotificationSettings.findUnique({
      where: { id }
    });
    return settings ? new UserNotificationSettingsResponseDto(settings) : null;
  }

  async findByUser(tenantId: string, userId: string): Promise<UserNotificationSettingsResponseDto | null> {
    const settings = await this.prisma.userNotificationSettings.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      }
    });
    return settings ? new UserNotificationSettingsResponseDto(settings) : null;
  }

  async create(dto: CreateUserNotificationSettingsDto): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.prisma.userNotificationSettings.create({
      data: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        quietHoursEnabled: dto.quietHoursEnabled ?? false,
        quietHoursStart: dto.quietHoursStart ?? '22:00',
        quietHoursEnd: dto.quietHoursEnd ?? '07:00',
        digestEnabled: dto.digestEnabled ?? true,
        digestFrequency: dto.digestFrequency ?? 'daily',
        emailDigest: dto.emailDigest ?? true,
        pushDigest: dto.pushDigest ?? false,
        smsEnabled: dto.smsEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? true,
        inAppEnabled: dto.inAppEnabled ?? true,
        timezone: dto.timezone ?? 'UTC',
        language: dto.language ?? 'en',
      }
    });
    return new UserNotificationSettingsResponseDto(settings);
  }

  async update(
    tenantId: string, 
    userId: string, 
    dto: UpdateUserNotificationSettingsDto
  ): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.prisma.userNotificationSettings.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      data: {
        quietHoursEnabled: dto.quietHoursEnabled,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        digestEnabled: dto.digestEnabled,
        digestFrequency: dto.digestFrequency,
        emailDigest: dto.emailDigest,
        pushDigest: dto.pushDigest,
        smsEnabled: dto.smsEnabled,
        emailEnabled: dto.emailEnabled,
        inAppEnabled: dto.inAppEnabled,
        timezone: dto.timezone,
        language: dto.language,
      }
    });
    return new UserNotificationSettingsResponseDto(settings);
  }

  async upsert(
    tenantId: string,
    userId: string,
    dto: CreateUserNotificationSettingsDto
  ): Promise<UserNotificationSettingsResponseDto> {
    const settings = await this.prisma.userNotificationSettings.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      update: dto,
      create: {
        tenantId,
        userId,
        quietHoursEnabled: dto.quietHoursEnabled ?? false,
        quietHoursStart: dto.quietHoursStart ?? '22:00',
        quietHoursEnd: dto.quietHoursEnd ?? '07:00',
        digestEnabled: dto.digestEnabled ?? true,
        digestFrequency: dto.digestFrequency ?? 'daily',
        emailDigest: dto.emailDigest ?? true,
        pushDigest: dto.pushDigest ?? false,
        smsEnabled: dto.smsEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? true,
        inAppEnabled: dto.inAppEnabled ?? true,
        timezone: dto.timezone ?? 'UTC',
        language: dto.language ?? 'en',
      }
    });
    return new UserNotificationSettingsResponseDto(settings);
  }

  async delete(tenantId: string, userId: string): Promise<void> {
    await this.prisma.userNotificationSettings.delete({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      }
    });
  }

  async shouldSendDuringQuietHours(
    tenantId: string, 
    userId: string, 
    priority: string
  ): Promise<boolean> {
    if (priority === 'HIGH') {
      return true;
    }

    const settings = await this.findByUser(tenantId, userId);
    if (!settings || !settings.quietHoursEnabled) {
      return true;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const [startHour] = settings.quietHoursStart.split(':').map(Number);
    const [endHour] = settings.quietHoursEnd.split(':').map(Number);

    if (startHour > endHour) {
      // Quiet hours cross midnight
      return !(currentHour >= startHour || currentHour < endHour);
    } else {
      return !(currentHour >= startHour && currentHour < endHour);
    }
  }
}