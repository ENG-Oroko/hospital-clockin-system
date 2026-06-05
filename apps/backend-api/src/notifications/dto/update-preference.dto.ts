import { IsEnum, IsBoolean } from 'class-validator';
import { NotificationChannel, NotificationTriggerEvent } from '../types/notification.types';

export class UpdatePreferenceDto {
  @IsEnum(NotificationTriggerEvent)
  event: NotificationTriggerEvent;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsBoolean()
  enabled: boolean;
}