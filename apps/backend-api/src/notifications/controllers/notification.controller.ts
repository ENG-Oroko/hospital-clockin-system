// controllers/notification.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MarkAsReadDto } from '../dto/mark-as-read.dto'; // ← ADD THIS LINE
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationsService } from '../services/notification.service';
import { DispatcherService } from '../services/dispatcher.service';
import { PreferenceService } from '../services/preference.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdatePreferenceDto } from '../dto/update-preference.dto';

import {PaginatedNotificationResponseDto, NotificationSummaryDto , NotificationResponseDto}
 from '../dto/notification-response.dto'
// Correct imports
import {
  DigestStatisticsDto,
  DigestGenerationOptions,
  PaginatedDigestResponseDto,
  NotificationDigestResponseDto,
  AddDigestItemsDto,
  UpdateNotificationDigestDto,
  CreateNotificationDigestDto,
  NotificationDigestEntity,
} from '../entities/notification-digest.entity';
import {
  
  UpdateNotificationPreferenceDto,
  BulkUpdateNotificationPreferenceDto,
  NotificationPreferenceResponseDto,
} from '../entities/notification-preference.entity';
import {
  CreateUserNotificationSettingsDto,
  UpdateUserNotificationSettingsDto,
  UserNotificationSettingsResponseDto,
} from '../entities/user-notification-settings.entity';
import {
  NotificationTriggerEvent,
  NotificationChannel,
  NotificationPriority,
  NotificationPayload,
} from '../types/notification.types';

@ApiTags('notifications')
@Controller('api/notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationsService,
    private readonly dispatcherService: DispatcherService,
    private readonly preferenceService: PreferenceService,
  ) {}

  // ==================== Notification Management ====================

@Get()
@ApiOperation({ summary: 'Get user notifications' })
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
@ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Only unread notifications' })
@ApiQuery({ name: 'type', required: false, enum: NotificationTriggerEvent, description: 'Filter by event type' })
@ApiResponse({ status: 200, type: PaginatedNotificationResponseDto })
async getUserNotifications(
  @Req() req: any,
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  @Query('unreadOnly') unreadOnly?: string,
  @Query('type') type?: NotificationTriggerEvent,
): Promise<PaginatedNotificationResponseDto> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];

  // ✅ FIXED: Changed Query?. to the parameter variables
  const filters = {
    unreadOnly: unreadOnly === 'true' ,
    type: type as NotificationTriggerEvent
  };
  
  const result = await this.notificationService.findByUser(
    tenantId, 
    userId, 
    page, 
    limit, 
    filters
  );
  
  // ✅ ADDED: Return the result with proper structure
  return {
    items: (result as any).data || (result as any).items || [],
    total: result.total || 0,
    page: page,
    limit: limit,
    totalPages: Math.ceil((result.total || 0) / limit),
  };
}

@Get('unread/count')
@ApiOperation({ summary: 'Get unread notification count' })
@ApiResponse({ status: 200, description: 'Returns unread count' })
async getUnreadCount(@Req() req: any): Promise<{ count: number }> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const count = await this.notificationService.countUnread(tenantId, userId);
  return { count };
}

@Get('summary')
@ApiOperation({ summary: 'Get notification summary' })
@ApiResponse({ status: 200, type: NotificationSummaryDto })
async getSummary(@Req() req: any): Promise<NotificationSummaryDto> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const result = await this.notificationService.getSummary(tenantId, userId);
  
  // ✅ FIXED: Ensure recentNotifications have required properties
  return {
    unreadCount: result.unreadCount,
    totalCount: result.totalCount,
    hasUnread: result.hasUnread,
    recentNotifications: ((result as any).recentNotifications || []).map((n: any) => ({
      id: n.id,
      tenantId: n.tenantId,
      userId: n.userId,
      title: n.title,
      body: n.body,
      channel: n.channel,
      status: n.status,
      priority: n.priority,
      type: n.type || 'SYSTEM',
      isRead: n.isRead || false,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      metadata: n.metadata || {},
    })),
  };
}

@Get(':id')
@ApiOperation({ summary: 'Get notification by ID' })
@ApiParam({ name: 'id', type: String, description: 'Notification ID' })
@ApiResponse({ status: 200, type: NotificationResponseDto })
async getNotification(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() req: any,
): Promise<NotificationResponseDto> {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const result = await this.notificationService.findById(id, tenantId);
  
  // ✅ FIXED: Add missing required properties
  return {
    ...result,
    type: (result as any).type || 'SYSTEM',
    isRead: (result as any).isRead || false,
    metadata: (result as any).metadata || {},
  };
}

@Post()
@ApiOperation({ summary: 'Create and send a notification' })
@ApiBody({ type: CreateNotificationDto })
@ApiResponse({ status: 201, type: NotificationResponseDto })
@HttpCode(HttpStatus.CREATED)
async createNotification(
  @Body(ValidationPipe) dto: CreateNotificationDto,
  @Req() req: any,
): Promise<NotificationResponseDto> {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const result = await this.notificationService.create({
    ...dto,
    tenantId,
    userId: dto.userId || req.user?.id,
  });
  
  // ✅ FIXED: Add missing required properties
  return {
    ...result,
    type: (result as any).type || 'SYSTEM',
    isRead: (result as any).isRead || false,
    metadata: (result as any).metadata || {},
  };
}

@Post('send')
@ApiOperation({ summary: 'Send notification immediately' })
@ApiBody({ type: CreateNotificationDto })
@ApiResponse({ status: 200, description: 'Notification sent' })
async sendNotification(
  @Body(ValidationPipe) dto: CreateNotificationDto,
  @Req() req: any,
): Promise<{ success: boolean; results?: any[] }> {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const payload: NotificationPayload = {
    tenantId,
    userId: dto.userId || req.user?.id,
    event: dto.triggerEvent,
    priority: dto.priority || 'MEDIUM',
    channels: [dto.channel],
    recipient: dto.recipient,
    data: dto.metadata || {},
    actions: dto.actions,
    expiresInMinutes: dto.expiresAt ? undefined : undefined,
  };

  const results = await this.dispatcherService.sendNow(payload);
  return { success: results.some(r => r.success), results };
}

@Patch(':id/read')
@ApiOperation({ summary: 'Mark notification as read' })
@ApiParam({ name: 'id', type: String, description: 'Notification ID' })
@ApiResponse({ status: 200, description: 'Notification marked as read' })
async markAsRead(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() req: any,
): Promise<{ success: boolean }> {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  await this.notificationService.markAsRead(id, tenantId);
  return { success: true };
}

@Patch('mark-all-read')
@ApiOperation({ summary: 'Mark all notifications as read' })
@ApiResponse({ status: 200, description: 'All notifications marked as read' })
async markAllAsRead(@Req() req: any): Promise<{ count: number }> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const count = await this.notificationService.markAllAsRead(tenantId, userId);
  return { count };
}

@Post('mark-bulk-read')
@ApiOperation({ summary: 'Mark multiple notifications as read' })
@ApiBody({ type: MarkAsReadDto })
@ApiResponse({ status: 200, description: 'Notifications marked as read' })
async markBulkAsRead(
  @Body(ValidationPipe) dto: MarkAsReadDto,
  @Req() req: any,
): Promise<{ count: number }> {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const count = await this.notificationService.markBulkAsRead(
    tenantId,
    dto.notificationIds,
  );
  return { count };
}

@Delete(':id')
@ApiOperation({ summary: 'Delete notification' })
@ApiParam({ name: 'id', type: String, description: 'Notification ID' })
@ApiResponse({ status: 200, description: 'Notification deleted' })
async deleteNotification(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() req: any,
): Promise<{ success: boolean }> {
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  await this.notificationService.delete(id, tenantId);
  return { success: true };
}

@Delete('clear-all')
@ApiOperation({ summary: 'Clear all notifications for user' })
@ApiResponse({ status: 200, description: 'All notifications cleared' })
async clearAllNotifications(@Req() req: any): Promise<{ count: number }> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const count = await this.notificationService.clearAll(tenantId, userId);
  return { count };
}

 
  // controllers/notification.controller.ts (partial - only preference methods)
// ==================== Preferences Management ====================

@Get('preferences')
@ApiOperation({ summary: 'Get user notification preferences' })
@ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
async getPreferences(@Req() req: any): Promise<NotificationPreferenceResponseDto[]> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const preferences = await this.preferenceService.getAll(tenantId, userId);
  return preferences.map(pref => ({
    ...pref,
    mandatory: pref.mandatory || false,
  }));
}

@Get('preferences/summary')
@ApiOperation({ summary: 'Get preference summary' })
@ApiResponse({ status: 200, description: 'Returns preference summary' })
async getPreferenceSummary(@Req() req: any): Promise<any> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  return this.preferenceService.getSummary(tenantId, userId);
}

// First method - uses PUT /preferences
@Put('preferences')
@ApiOperation({ summary: 'Bulk update notification preferences (legacy)' })
@ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
async bulkUpdatePreferencesLegacy(
  @Body() dto: { preferences: Array<{ type: string; enabled?: boolean; channels?: string[] }> },
  @Req() req: any,
): Promise<NotificationPreferenceResponseDto[]> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const updatedList = await this.preferenceService.bulkUpdate(tenantId, userId, dto.preferences);
  return updatedList.map(pref => ({
    ...pref,
    mandatory: pref.mandatory || false,
  }));
}

// Second method - uses PUT /preferences/bulk
@Put('preferences/bulk')
@ApiOperation({ summary: 'Bulk update notification preferences' })
@ApiBody({ type: BulkUpdateNotificationPreferenceDto })
@ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
async bulkUpdatePreferences(
  @Body(ValidationPipe) dto: BulkUpdateNotificationPreferenceDto,
  @Req() req: any,
): Promise<NotificationPreferenceResponseDto[]> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const updatedList = await this.preferenceService.bulkUpdate(
    tenantId,
    userId,
    dto.preferences,
  );
  
  return updatedList.map(pref => ({
    ...pref,
    mandatory: pref.mandatory || false,
  }));
}

@Post('preferences/reset')
@ApiOperation({ summary: 'Reset all preferences to default' })
@ApiResponse({ status: 200, description: 'Preferences reset' })
async resetPreferences(@Req() req: any): Promise<{ count: number }> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  const count = await this.preferenceService.resetToDefault(tenantId, userId);
  return { count };
}

// ==================== User Settings Management ====================

@Get('settings')
@ApiOperation({ summary: 'Get user notification settings' })
@ApiResponse({ status: 200, type: UserNotificationSettingsResponseDto })
async getUserSettings(@Req() req: any): Promise<UserNotificationSettingsResponseDto> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  return this.preferenceService.getUserSettings(tenantId, userId);
}

@Put('settings')
@ApiOperation({ summary: 'Update user notification settings' })
@ApiBody({ type: UpdateUserNotificationSettingsDto })
@ApiResponse({ status: 200, type: UserNotificationSettingsResponseDto })
async updateUserSettings(
  @Body(ValidationPipe) dto: UpdateUserNotificationSettingsDto,
  @Req() req: any,
): Promise<UserNotificationSettingsResponseDto> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  return this.preferenceService.updateUserSettings(tenantId, userId, dto);
}

@Put('settings/quiet-hours')
@ApiOperation({ summary: 'Update quiet hours settings' })
@ApiResponse({ status: 200, description: 'Quiet hours updated' })
async updateQuietHours(
  @Body() dto: { enabled: boolean; start?: string; end?: string },
  @Req() req: any,
): Promise<{ success: boolean }> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  await this.preferenceService.updateQuietHours(
    tenantId,
    userId,
    dto.enabled,
    dto.start,
    dto.end,
  );
  return { success: true };
}

@Put('settings/digest')
@ApiOperation({ summary: 'Update digest settings' })
@ApiResponse({ status: 200, description: 'Digest settings updated' })
async updateDigestSettings(
  @Body() dto: { enabled: boolean; frequency?: string; emailDigest?: boolean; pushDigest?: boolean },
  @Req() req: any,
): Promise<{ success: boolean }> {
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  await this.preferenceService.updateDigestSettings(
    tenantId,
    userId,
    dto.enabled,
    dto.frequency,
    dto.emailDigest,
    dto.pushDigest,
  );
  return { success: true };
}

  // ==================== Admin Endpoints ====================

  @Post('admin/broadcast')
  @ApiOperation({ summary: 'Admin: Broadcast notification to multiple users' })
  @ApiBody({ description: 'Broadcast payload' })
  @ApiResponse({ status: 200, description: 'Broadcast sent' })
  async broadcastNotification(
    @Body() dto: {
      title: string;
      body: string;
      userIds: string[];
      channel?: NotificationChannel;
      priority?: NotificationPriority;
      triggerEvent?: NotificationTriggerEvent;
    },
    @Req() req: any,
  ): Promise<{ success: boolean; count: number }> {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    
    const count = await this.notificationService.broadcast(
      tenantId,
      dto.userIds,
      {
        title: dto.title,
        body: dto.body,
        channel: dto.channel || NotificationChannel.IN_APP,
        priority: dto.priority || NotificationPriority.MEDIUM,
        triggerEvent: dto.triggerEvent,
      },
    );
    
    return { success: true, count };
  }

  @Get('admin/stats')
  @ApiOperation({ summary: 'Admin: Get notification statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days' })
  @ApiResponse({ status: 200, description: 'Returns statistics' })
  async getAdminStats(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @Req() req: any,
  ): Promise<any> {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    
    return this.notificationService.getStats(tenantId, undefined, undefined);  }

  @Post('admin/retry-failed')
  @ApiOperation({ summary: 'Admin: Retry failed notifications' })
  @ApiResponse({ status: 200, description: 'Retry job started' })
  async retryFailedNotifications(@Req() req: any): Promise<{ success: boolean }> {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    
    await this.dispatcherService.retryFailed(tenantId);
    return { success: true };
  }

  @Delete('admin/cleanup')
  @ApiOperation({ summary: 'Admin: Clean up old notifications' })
  @ApiQuery({ name: 'daysOld', required: false, type: Number, description: 'Days to keep' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupNotifications(
    @Query('daysOld', new DefaultValuePipe(90), ParseIntPipe) daysOld: number,
    @Req() req: any,
  ): Promise<{ deletedCount: number }> {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    
    const deletedCount = await this.notificationService.cleanup(tenantId, daysOld);
    return { deletedCount };
  }

  // ==================== Webhook Endpoints ====================

  @Post('webhook/email')
  @ApiOperation({ summary: 'Email delivery webhook' })
  @HttpCode(HttpStatus.OK)
  async handleEmailWebhook(@Body() body: any): Promise<{ received: boolean }> {
    // Handle email provider webhooks (SendGrid, AWS SES, etc.)
    await this.notificationService.handleEmailWebhook(body);
    return { received: true };
  }

  @Post('webhook/sms')
  @ApiOperation({ summary: 'SMS delivery webhook' })
  @HttpCode(HttpStatus.OK)
  async handleSmsWebhook(@Body() body: any): Promise<{ received: boolean }> {
    // Handle SMS provider webhooks (Twilio, Vonage, etc.)
    await this.notificationService.handleSmsWebhook(body);
    return { received: true };
  }
}