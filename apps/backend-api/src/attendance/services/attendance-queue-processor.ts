// attendance-queue.processor.ts
import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { AttendanceProcessorService } from './attendance-processor.service';
import { QUEUE_NAMES, ATTENDANCE_JOB_NAMES } from '../../queue/constants/queue-names.constants';

@Processor(QUEUE_NAMES.ATTENDANCE_PROCESSING)
export class AttendanceQueueProcessor {
  private readonly logger = new Logger(AttendanceQueueProcessor.name);

  constructor(
    private readonly processor: AttendanceProcessorService,
  ) {}

  @Process(ATTENDANCE_JOB_NAMES.PROCESS_LOG)
  async handleAttendanceProcess(job: Job) {
    const { userId, tenantId, date, retryCount = 0 } = job.data;
    
    this.logger.debug(`Processing attendance for user ${userId} on ${date}`);
    
    try {
      const result = await this.processor.processUserDay(
        userId,
        tenantId,
        new Date(date),
      );
      
      return { success: true, result };
    } catch (error) {
      this.logger.error(`Failed to process ${userId} on ${date}: ${error.message}`);
      
      // Retry logic can be handled by Bull's built-in retry
      throw error;
    }
  }

  @Process(ATTENDANCE_JOB_NAMES.REPROCESS_LOG)
  async handleReprocess(job: Job) {
    const { userId, tenantId, date } = job.data;
    
    this.logger.log(`Reprocessing attendance for user ${userId} on ${date}`);
    
    return this.processor.processUserDay(userId, tenantId, new Date(date));
  }

  @Process('attendance.nightshift')
  async handleNightShift(job: Job) {
    const { userId, tenantId, shiftDate } = job.data;
    
    this.logger.debug(`Processing night shift for user ${userId} on ${shiftDate}`);
    
    return this.processor.processNightShift(userId, tenantId, new Date(shiftDate));
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}