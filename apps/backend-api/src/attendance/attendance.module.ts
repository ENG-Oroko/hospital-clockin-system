import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceProcessorService } from './services/attendance-processor.service';
import { AttendanceWorkerService } from './services/attendance-worker.service';
import { AttendanceQueueProcessor } from './services/attendance-queue-processor';

import { QueueModule } from '../queue/queue.module';
import { RosterModule } from '../roster/roster.module';
import { LeaveModule } from '../leave/leave.module';
import { QUEUE_NAMES } from '../queue/constants/queue-names.constants';

// REMOVED: NotificationsModule — caused circular dep:
//   AttendanceModule → NotificationsModule → WebsocketModule → AttendanceModule
// FIX: AttendanceService emits EventEmitter2 events. NotificationListener
//   in NotificationsModule catches them. No direct import needed.
//
// REMOVED: PrismaService from providers — DatabaseModule is @Global().
//   Adding it again creates a second DB connection pool.
//
// REMOVED: inline redis:{} from BullModule.registerQueue — Redis config
//   lives only in BullModule.forRoot() in AppModule.

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.ATTENDANCE_PROCESSING,
    }),
    RosterModule,
    LeaveModule,
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceProcessorService,
    AttendanceWorkerService,
    AttendanceQueueProcessor,
  ],
  exports: [
    AttendanceService,
    AttendanceProcessorService,
  ],
})
export class AttendanceModule {}