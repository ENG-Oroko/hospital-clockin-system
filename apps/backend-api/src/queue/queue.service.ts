import { Injectable, Logger, 
  ServiceUnavailableException,
  OnModuleInit, } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bull';
import type{ Queue, Job, JobOptions } from 'bull';
import { QUEUE_NAMES, ATTENDANCE_JOB_NAMES } from './constants/queue-names.constants';
import { QueueConfig } from './queue.config';
import { QueueHealthService } from './queue.health.service';
import { FallbackDiskWriterService } from './fallback-disk-writer.service';
import { IAttendanceIngestionJob } from './interfaces';

// Import helpers (clean barrel import)
import { 
  getErrorMessage, 
  getErrorStack,
  formatErrorLog,
  isTransientError,
} from './helpers';

@Injectable()
export class QueueService implements OnModuleInit {

  private readonly logger = new Logger(QueueService.name);

  constructor(
    // Inject the attendance processing queue
    // Registered in queue.module.ts with QUEUE_NAMES.ATTENDANCE_PROCESSING
    @InjectQueue(QUEUE_NAMES.ATTENDANCE_PROCESSING)
    private readonly attendanceQueue: Queue,

    // Inject configuration provider
    private readonly queueConfig: QueueConfig,

    // Inject health service (separated for clean architecture)
    private readonly healthService: QueueHealthService,

    // Inject fallback writer service
    private readonly fallbackWriter: FallbackDiskWriterService,
  ) {}

  async onModuleInit(): Promise<void> {
    
    // Log configuration for debugging
    this.queueConfig.logConfiguration();

    // Log initial queue status
    const health = await this.healthService.getHealthMetrics();
    
    this.logger.log(
      `Queue service initialized:\n` +
      `  Status: ${health.status}\n` +
      `  Health Score: ${health.healthScore}/100\n` +
      `  Waiting Jobs: ${health.metrics.waiting}\n` +
      `  Capacity: ${health.capacity.utilizationPercent}%`,
    );

    // Warn if unrecovered fallback files exist
    if (health.fallback.requiresRecovery) {
      this.logger.warn(
        `⚠️ ${health.fallback.fileCount} unrecovered fallback files detected!\n` +
        `  Run: npm run queue:recover-fallback`,
      );
    }
  }

  async addAttendanceJob(
    payload: IAttendanceIngestionJob,
    priority: number = 5,
  ): Promise<Job<IAttendanceIngestionJob>> {
    
    // STEP 1: Validate priority parameter
    // Ensure priority is within valid range (1-10)
    const validPriority = Math.max(1, Math.min(10, priority));
    
    if (validPriority !== priority) {
      this.logger.warn(
        `Invalid priority ${priority} adjusted to ${validPriority} (valid range: 1-10)`,
      );
    }

    // STEP 2: Check backpressure (queue capacity)
    // Prevents overwhelming Redis and downstream processors
    const isBackpressure = await this.healthService.isBackpressureActive();
    
    if (isBackpressure) {
      
      // Log rejection with job details
      this.logger.error(
        `🚫 Queue at capacity. Rejecting job:\n` +
        `  User: ${payload.userId}\n` +
        `  Date: ${payload.date}\n` +
        `  Tenant: ${payload.tenantId}\n` +
        `  Priority: ${validPriority}`,
      );

      // Throw HTTP 503 exception
      // Client (attendance module) should handle this gracefully
      // Could retry with exponential backoff or alert admin
      throw new ServiceUnavailableException(
        'Queue is at capacity. Please retry later.',
      );
    }

    // STEP 3: Attempt to add job to Redis queue
    try {
      
      // Get job options from configuration
      const jobOptions = this.queueConfig.getAttendanceJobOptions(validPriority);

      // Add job to BullMQ queue
      const job = await this.attendanceQueue.add(
        // Job name (used by processor to route to correct handler)
        ATTENDANCE_JOB_NAMES.PROCESS_LOG,
        
        // Job payload (serialized to JSON in Redis)
        // IMPORTANT: Must contain ONLY primitive types
        payload,
        
        // Job options (retry, TTL, etc.)
        jobOptions,
      );

      // STEP 4: Log successful job creation
      this.logger.log(
        `✅ Job queued successfully:\n` +
        `  Job ID: ${job.id}\n` +
        `  User: ${payload.userId}\n` +
        `  Date: ${payload.date}\n` +
        `  Priority: ${validPriority}\n` +
        `  Correlation ID: ${payload.correlationId || 'none'}`,
      );

      // STEP 5: Return job reference
      // Caller can use this to track job status if needed
      return job;

    } catch (error) {
      
      // STEP 6: Handle Redis failure
     this.logger.error(
        formatErrorLog(error, {
          operation: 'addAttendanceJob',
          userId: payload.userId,
          date: payload.date,
          tenantId: payload.tenantId,
        }),
      );

      await this.fallbackWriter.writeJobToDisk(
        QUEUE_NAMES.ATTENDANCE_PROCESSING,
        payload,
      );

      const isTransient = isTransientError(error);
      
      throw new ServiceUnavailableException(
        `Queue unavailable. Job saved to fallback storage. ` +
        `Error: ${getErrorMessage(error)} ` +
        `(${isTransient ? 'Transient - may recover' : 'Persistent - requires attention'})`,
      );
    }
  }

  async addAttendanceJobsBulk(
    payloads: IAttendanceIngestionJob[],
    priority: number = 7,
  ): Promise<Job<IAttendanceIngestionJob>[]> {
    
    // STEP 1: Validate input
    if (!payloads || payloads.length === 0) {
      this.logger.warn('Attempted to add empty bulk job array');
      return [];
    }

    this.logger.log(
      `📦 Adding ${payloads.length} jobs in bulk (priority: ${priority})...`,
    );

    // STEP 2: Check capacity (ensure room for all jobs)
    const isBackpressure = await this.healthService.isBackpressureActive();
    
    if (isBackpressure) {
      throw new ServiceUnavailableException(
        `Queue at capacity. Cannot add ${payloads.length} bulk jobs.`,
      );
    }

    // STEP 3: Prepare job options
    const jobOptions = this.queueConfig.getAttendanceJobOptions(priority);

    try {
      
      // STEP 4: Add all jobs in single operation
      // BullMQ uses Redis pipeline for efficiency
      const jobs = await this.attendanceQueue.addBulk(
        payloads.map((payload) => ({
          name: ATTENDANCE_JOB_NAMES.PROCESS_LOG,
          data: payload,
          opts: jobOptions,
        })),
      );

      // STEP 5: Log success
      this.logger.log(
        `✅ Bulk jobs queued: ${jobs.length} jobs added successfully`,
      );

      return jobs;

    } catch (error) {
      // ✅ FIX 4: Use error helpers
      this.logger.error(
        `❌ Bulk job add failed: ${getErrorMessage(error)}\n` +
        `  Writing ${payloads.length} jobs to disk fallback...`,
        getErrorStack(error),
      );

      for (const payload of payloads) {
        await this.fallbackWriter.writeJobToDisk(
          QUEUE_NAMES.ATTENDANCE_PROCESSING,
          payload,
        );
      }

      throw new ServiceUnavailableException(
        `Bulk job add failed. ${payloads.length} jobs saved to fallback.`,
      );
     
    }
  }

  async pauseQueue(): Promise<void> {
    
    try {
      
      await this.attendanceQueue.pause();
      
      this.logger.warn(
        `⏸️  QUEUE PAUSED\n` +
        `  Queue: ${QUEUE_NAMES.ATTENDANCE_PROCESSING}\n` +
        `  Workers will stop processing jobs.\n` +
        `  New jobs can still be added.\n` +
        `  Resume with: queueService.resumeQueue()`,
      );

    } catch (error) {
      // ✅ FIX 5: Use error helpers
      this.logger.error(
        `Failed to pause queue: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async resumeQueue(): Promise<void> {
    
    try {
      
      await this.attendanceQueue.resume();
      
      this.logger.log(
        `▶️  QUEUE RESUMED\n` +
        `  Queue: ${QUEUE_NAMES.ATTENDANCE_PROCESSING}\n` +
        `  Workers will resume processing jobs.`,
      );

    } catch (error) {
      // Use error helpers
      this.logger.error(
        `Failed to resume queue: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async clearCompletedJobs(): Promise<number> {
    
    try {
      
      const completedCount = await this.attendanceQueue.getCompletedCount();
      
      // Clean all completed jobs (0 = no grace period)
      await this.attendanceQueue.clean(0, 'completed');
      
      this.logger.warn(
        `🧹 Cleared ${completedCount} completed jobs from queue`,
      );

      return completedCount;

    } catch (error) {
      
      this.logger.error(
        `Failed to clear completed jobs: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async clearFailedJobs(): Promise<number> {
    
    try {
      
      const failedCount = await this.attendanceQueue.getFailedCount();
      
      // Clean all failed jobs
      await this.attendanceQueue.clean(0, 'failed');
      
      this.logger.warn(
        `🧹 Cleared ${failedCount} failed jobs from queue\n` +
        `  Ensure failures were logged to error tracking system.`,
      );

      return failedCount;

    } catch (error) {
      
      this.logger.error(
        `Failed to clear failed jobs: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }
  async getJob(jobId: string): Promise<Job<IAttendanceIngestionJob> | null> {
    
    try {
      
      const job = await this.attendanceQueue.getJob(jobId);
      return job || null;

    } catch (error) {
      
      this.logger.error(
        `Failed to get job ${jobId}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      return null;
    }
  }

  async retryJob(jobId: string): Promise<void> {
    
    try {
      
      const job = await this.attendanceQueue.getJob(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Retry the job (moves from failed to waiting)
      await job.retry();
      
      this.logger.log(`🔄 Job ${jobId} queued for retry`);

    } catch (error) {
      // Use error helpers
      this.logger.error(
        `Failed to retry job ${jobId}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }
  async removeJob(jobId: string): Promise<void> {
    
    try {
      
      const job = await this.attendanceQueue.getJob(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await job.remove();
      
      this.logger.warn(`🗑️  Job ${jobId} removed from queue`);

    } catch (error) {
      
      this.logger.error(
        `Failed to remove job ${jobId}: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  async getQueueSize(): Promise<number> {
    
    try {
      return await this.attendanceQueue.getWaitingCount();
    } catch (error) {
      this.logger.error(
        `Failed to get queue size: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      // Return max size if Redis unavailable (fail safe for backpressure)
      return this.queueConfig.maxQueueSize;
    }
  }

  async isPaused(): Promise<boolean> {
    
    try {
      return await this.attendanceQueue.isPaused();
    } catch (error) {
      this.logger.error(
        `Failed to check pause status: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      return false;
    }
  }
}