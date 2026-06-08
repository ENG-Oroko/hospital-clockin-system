import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';

// Core services
import { NotificationsService } from './services/notification.service';
import { DispatcherService } from './services/dispatcher.service';
import { RendererService } from './services/renderer.service';
import { PreferenceService } from './services/preference.service';

// Controllers
import { NotificationsController } from './notifications.controller';
import { NotificationController } from './controllers/notification.controller';

// Channels
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';

// Rules
import { LateInRule } from './rules/late-in.rule';
import { MissedPunchRule } from './rules/missed-punch.rule';
import { OvertimeRule } from './rules/overtime.rule';

// Listeners
import { NotificationListener } from './listeners/notification.listener';

// Repositories
import { NotificationRepository } from './repositories/notification.repository';
import { PreferenceRepository } from './repositories/preference.repository';

// Jobs
import { RetryFailedJob } from './jobs/retry-failed.job';

// Middleware
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



import { SettingsModule } from '../settings/settings.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    // EventEmitter is the decoupling layer between AttendanceModule and
    // NotificationsModule. AttendanceService emits events, NotificationListener
    // catches them here — no circular import needed.
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Redis config comes from BullModule.forRoot() in AppModule.
    // Never put redis: {} here — it duplicates config and can connect
    // to a different Redis instance than the rest of the app.
    BullModule.registerQueue({
      name: 'notifications',
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

    // Needed by PreferenceService to enforce DND / quiet hours per org
    SettingsModule,
    TenantModule,
  ],

  controllers: [
    NotificationsController,
    NotificationController,
  ],

  providers: [
    // Repositories
    NotificationRepository,
    PreferenceRepository,

    // Channels
    InAppChannel,
    EmailChannel,
    SmsChannel,

    // Jobs
    RetryFailedJob,

    // Services
    DispatcherService,
    RendererService,
    PreferenceService,
    NotificationsService,

    // Rules
    LateInRule,
    MissedPunchRule,
    OvertimeRule,

    // Middleware
    NotificationRequestMiddleware,
    NotificationRateLimitMiddleware,
    NotificationAuthMiddleware,
    NotificationValidationMiddleware,
    NotificationLoggingMiddleware,
    NotificationSecurityMiddleware,
    NotificationUserContextMiddleware,
    NotificationCompressionMiddleware,
    NotificationIdempotencyMiddleware,

    // Listeners — catches EventEmitter events from AttendanceModule,
    // RosterModule, etc. and routes them to DispatcherService
    NotificationListener,

    // NOTE: NotificationGateway has been moved to WebsocketModule.
    // It was listed here AND imported from WebsocketModule simultaneously,
    // which creates a duplicate provider conflict.
  ],

  exports: [
    // Exported so WebsocketModule can push via DispatcherService
    DispatcherService,
    NotificationsService,
    PreferenceService,

    // Exported so AttendanceModule can reference rule types if needed
    // (but AttendanceModule should NOT import NotificationsModule —
    //  it should emit events instead)
    LateInRule,
    MissedPunchRule,
    OvertimeRule,
  ],
})
export class NotificationsModule {}