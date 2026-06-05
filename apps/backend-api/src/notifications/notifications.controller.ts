import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService, SendNotificationDto, NotificationQuery } from './services/notification.service';

// Mock user - replace with actual authenticated user
const MOCK_USER = {
  tenantId: 'tenant-001',
  id: 'user-001',
};

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query: NotificationQuery = {
      tenantId: MOCK_USER.tenantId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    };
    
    if (status) query.status = status;
    if (channel) query.channel = channel as any;
    if (startDate) query.startDate = new Date(startDate);
    if (endDate) query.endDate = new Date(endDate);

    return this.notificationsService.findAll(query);
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getStats(
      MOCK_USER.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id, MOCK_USER.tenantId);
  }

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send({
      ...dto,
      tenantId: MOCK_USER.tenantId,
    });
  }

  @Post('send/sms')
  @HttpCode(HttpStatus.CREATED)
  async sendSMS(
    @Body() data: { userId: string; phoneNumber: string; message: string }
  ) {
    return this.notificationsService.sendSMS(
      MOCK_USER.tenantId,
      data.userId,
      data.phoneNumber,
      data.message,
    );
  }

  @Post('send/email')
  @HttpCode(HttpStatus.CREATED)
  async sendEmail(
    @Body() data: { userId: string; email: string; subject: string; body: string }
  ) {
    return this.notificationsService.sendEmail(
      MOCK_USER.tenantId,
      data.userId,
      data.email,
      data.subject,
      data.body,
    );
  }

  @Post('attendance-alert')
  @HttpCode(HttpStatus.CREATED)
  async sendAttendanceAlert(
    @Body() data: { userId: string; direction: string; timestamp: Date; id: string }
  ) {
    return this.notificationsService.sendAttendanceNotification(
      MOCK_USER.tenantId,
      data.userId,
      data,
    );
  }

  @Put(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retryFailed(@Param('id') id: string) {
    return this.notificationsService.retryFailed(MOCK_USER.tenantId, id);
  }
}
