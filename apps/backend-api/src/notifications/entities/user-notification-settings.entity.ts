// entities/user-notification-settings.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * User Notification Settings Entity
 * Stores global notification settings for a user (quiet hours, digest preferences, etc.)
 */
@Entity('user_notification_settings')
@Unique('UQ_user_notification_settings', ['tenantId', 'userId'])
@Index(['tenantId', 'userId'])
export class UserNotificationSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'quiet_hours_enabled',
    type: 'boolean',
    default: false,
  })
  quietHoursEnabled: boolean;

  @Column({
    name: 'quiet_hours_start',
    type: 'varchar',
    length: 5,
    nullable: true,
    default: '22:00',
  })
  quietHoursStart: string;

  @Column({
    name: 'quiet_hours_end',
    type: 'varchar',
    length: 5,
    nullable: true,
    default: '07:00',
  })
  quietHoursEnd: string;

  @Column({
    name: 'digest_enabled',
    type: 'boolean',
    default: true,
  })
  digestEnabled: boolean;

  @Column({
    name: 'digest_frequency',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: 'daily',
  })
  digestFrequency: string;

  @Column({
    name: 'email_digest',
    type: 'boolean',
    default: true,
  })
  emailDigest: boolean;

  @Column({
    name: 'push_digest',
    type: 'boolean',
    default: false,
  })
  pushDigest: boolean;

  @Column({
    name: 'sms_enabled',
    type: 'boolean',
    default: true,
  })
  smsEnabled: boolean;

  @Column({
    name: 'email_enabled',
    type: 'boolean',
    default: true,
  })
  emailEnabled: boolean;

  @Column({
    name: 'in_app_enabled',
    type: 'boolean',
    default: true,
  })
  inAppEnabled: boolean;

  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'UTC',
  })
  timezone: string;

  @Column({
    name: 'language',
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'en',
  })
  language: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Check if a notification should be sent based on quiet hours
  shouldSendDuringQuietHours(priority: string): boolean {
    if (priority === 'HIGH') {
      return true;
    }
    if (!this.quietHoursEnabled) {
      return true;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const [startHour] = this.quietHoursStart.split(':').map(Number);
    const [endHour] = this.quietHoursEnd.split(':').map(Number);
    
    if (startHour > endHour) {
      // Quiet hours cross midnight
      return !(currentHour >= startHour || currentHour < endHour);
    } else {
      return !(currentHour >= startHour && currentHour < endHour);
    }
  }
}

/**
 * DTO for creating user notification settings
 */
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

/**
 * DTO for updating user notification settings
 */
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

/**
 * Response DTO for user notification settings
 */
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

  constructor(entity: UserNotificationSettingsEntity) {
    this.id = entity.id;
    this.tenantId = entity.tenantId;
    this.userId = entity.userId;
    this.quietHoursEnabled = entity.quietHoursEnabled;
    this.quietHoursStart = entity.quietHoursStart;
    this.quietHoursEnd = entity.quietHoursEnd;
    this.digestEnabled = entity.digestEnabled;
    this.digestFrequency = entity.digestFrequency;
    this.emailDigest = entity.emailDigest;
    this.pushDigest = entity.pushDigest;
    this.smsEnabled = entity.smsEnabled;
    this.emailEnabled = entity.emailEnabled;
    this.inAppEnabled = entity.inAppEnabled;
    this.timezone = entity.timezone;
    this.language = entity.language;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}