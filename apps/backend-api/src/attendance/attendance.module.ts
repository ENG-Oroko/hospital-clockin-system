import { Module, forwardRef } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceProcessorService } from './services/attendance-processor.service';
import { AttendanceWorkerService } from './services/attendance-worker.service';
import { PrismaService } from '../database/prisma.service';  // Import directly
import { QueueModule } from '../queue/queue.module';
import { RosterModule } from '../roster/roster.module';
import { LeaveModule } from '../leave/leave.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUE_NAMES } from '../queue/constants/queue-names.constants';
import { AttendanceQueueProcessor } from './services/attendance-queue-processor';
// Add this import
import { BullModule } from '@nestjs/bull';
@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.ATTENDANCE_PROCESSING,}),
    RosterModule,
    LeaveModule,
    NotificationsModule,
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceProcessorService,
    AttendanceWorkerService,
    PrismaService,  // Add PrismaService directly
    AttendanceQueueProcessor,  // This handles the actual job processing
  ],
  exports: [AttendanceService, AttendanceProcessorService],
})
export class AttendanceModule {}