// src/notifications/dto/mark-as-read.dto.ts
import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkAsReadDto {
  @ApiProperty({ 
    type: [String], 
    description: 'Array of notification IDs to mark as read',
    example: ['notif_123', 'notif_456']
  })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];

  @ApiProperty({ 
    required: false, 
    description: 'Mark all as read if true',
    example: false
  })
  @IsOptional()
  markAll?: boolean;
}