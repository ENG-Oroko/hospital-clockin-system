import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { QueueHealthService } from './queue.health.service';
import { FallbackDiskWriterService } from './fallback-disk-writer.service';
import { QUEUE_NAMES } from './constants/queue-names.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.ATTENDANCE_PROCESSING,
      config: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      },
    }),
  ],
  providers: [QueueService, QueueHealthService, FallbackDiskWriterService],
  exports: [QueueService],
})
export class QueueModule {}