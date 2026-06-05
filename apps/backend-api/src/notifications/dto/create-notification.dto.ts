import {
  IsEnum, IsString, IsUUID, IsOptional,
  IsObject, IsArray, IsInt, Min,
} from 'class-validator';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationTriggerEvent,
  NotificationAction,
} from '../types/notification.types';

export class CreateNotificationDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEnum(NotificationTriggerEvent)
  triggerEvent: NotificationTriggerEvent;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  recipient: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsArray()
  @IsOptional()
  actions?: NotificationAction[];

  @IsInt()
  @Min(1)
  @IsOptional()
  expiresAt?: number; // minutes from now
}