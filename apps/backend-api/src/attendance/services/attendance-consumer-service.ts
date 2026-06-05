// attendance-consumer.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { QUEUE_NAMES, ATTENDANCE_JOB_NAMES } from '../../queue/constants/queue-names.constants';
import { AttendanceProcessorService } from './attendance-processor.service';

@Injectable()
export class AttendanceConsumerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceConsumerService.name);
  private isProcessing = false;

  constructor(
    @InjectQueue(QUEUE_NAMES.ATTENDANCE_PROCESSING)
    private readonly attendanceQueue: Queue,
    private readonly processor: AttendanceProcessorService,
  ) {}

  async onModuleInit() {
    await this.startConsuming();
  }

  private async startConsuming() {
    this.isProcessing = true;
    
    // Process jobs in a loop (not recommended for production)
    while (this.isProcessing) {
      const job = await this.attendanceQueue.getNextJob();
      
      if (job) {
        await this.processJob(job);
      } else {
        // No jobs, wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processJob(job: Job) {
    try {
      const { userId, tenantId, date } = job.data;
      
      if (job.name === ATTENDANCE_JOB_NAMES.PROCESS_LOG) {
        await this.processor.processUserDay(userId, tenantId, new Date(date));
        await job.progress(100);
        await job.moveToCompleted('success', true);
      } else if (job.name === ATTENDANCE_JOB_NAMES.REPROCESS_LOG) {
        await this.processor.processUserDay(userId, tenantId, new Date(date));
        await job.moveToCompleted('success', true);
      } else if (job.name === 'attendance.nightshift') {
        const { shiftDate } = job.data;
        await this.processor.processNightShift(userId, tenantId, new Date(shiftDate));
        await job.moveToCompleted('success', true);
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      await job.moveToFailed(error);
    }
  }

  async onModuleDestroy() {
    this.isProcessing = false;
  }
}