// src/websocket/dtos/notification.dto.ts
import { IsString, IsOptional, IsNumber, IsEnum, IsUUID } from 'class-validator';

export class SendNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  data?: any;
}

export class MarkReadDto {
  @IsUUID()
  notificationId: string;
}

export class GetNotificationsDto {
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

export class WebSocketResponse<T = any> {
  event: string;
  data: T;
  timestamp: Date;
}