// notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './services/notification.service';
import { NotificationsController } from './notifications.controller'; // Simplified controller
import { NotificationController } from './controllers/notification.controller'; // Comprehensive controller
import { PrismaService } from '../database/prisma.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationGateway } from '../websocket/notification.gateway';

// Attendance helpers
import { AttendanceCalculator } from '../attendance/helpers/attendance-calculator';
import { OvertimeCalculator } from '../attendance/helpers/overtime-calculator';
import { TimeUtils } from '../attendance/helpers/time-utils';

// Notification services
import { DispatcherService } from './services/dispatcher.service';
import { RendererService } from './services/renderer.service';
import { PreferenceService } from './services/preference.service';

// Notification channels
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';

// Notification rules
import { LateInRule } from './rules/late-in.rule';
import { MissedPunchRule } from './rules/missed-punch.rule';
import { OvertimeRule } from './rules/overtime.rule';

// Notification listeners
import { NotificationListener } from './listeners/notification.listener';

// middleware
import {   
  NotificationRequestMiddleware,
  NotificationRateLimitMiddleware,
  NotificationAuthMiddleware,
  NotificationValidationMiddleware,
  NotificationLoggingMiddleware,
  NotificationSecurityMiddleware,
  NotificationUserContextMiddleware,
  NotificationCompressionMiddleware,
  NotificationIdempotencyMiddleware, 
} from './middlewares/notification.middleware';

// Notification repositories
import { NotificationRepository } from './repositories/notification.repository';
import { PreferenceRepository } from './repositories/preference.repository';
import { RetryFailedJob } from './jobs/retry-failed.job';

@Module({
  imports: [
    WebsocketModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    BullModule.registerQueue({
      name: 'notifications',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  controllers: [
    NotificationsController,  // Simplified controller (existing)
    NotificationController     // Comprehensive controller (new)
  ],
  providers: [
    // Database
    PrismaService,
    
    // Attendance helpers
    AttendanceCalculator,
    OvertimeCalculator,
    TimeUtils,
    
    // Repositories
    NotificationRepository,
    PreferenceRepository,
    
    // Channels
    InAppChannel,
    EmailChannel,
    SmsChannel,

    // jobs
    RetryFailedJob,
    
    // Services
    DispatcherService,
    RendererService,
    PreferenceService,
    NotificationsService, // Root service
    
    // Rules
    LateInRule,
    MissedPunchRule,
    OvertimeRule,

    // middleware
    NotificationRequestMiddleware,
    NotificationRateLimitMiddleware,
    NotificationAuthMiddleware,
    NotificationValidationMiddleware,
    NotificationLoggingMiddleware,
    NotificationSecurityMiddleware,
    NotificationUserContextMiddleware,
    NotificationCompressionMiddleware,
    NotificationIdempotencyMiddleware,

    // Listeners
    NotificationListener,
    
    // WebSocket
    NotificationGateway,
  ],
  exports: [
    DispatcherService,
    PreferenceService,
    LateInRule,
    MissedPunchRule,
    OvertimeRule,
    NotificationsService,
  ],
})
export class NotificationsModule {}