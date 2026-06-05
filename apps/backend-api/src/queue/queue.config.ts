import { Injectable, Logger } from '@nestjs/common';
import { JobOptions } from 'bull';

@Injectable()
export class QueueConfig {
  private readonly logger = new Logger(QueueConfig.name);

  // BACKPRESSURE CONFIGURATION
  
  
   // Maximum number of jobs allowed in queue before triggering backpressure
 
  readonly maxQueueSize: number = parseInt(
    process.env.QUEUE_MAX_SIZE || '5000',
    10,
  );

  readonly backpressureWarningThreshold: number = parseFloat(
    process.env.QUEUE_WARNING_THRESHOLD || '0.8',
  );

  
  // RETRY CONFIGURATION

  readonly maxRetryAttempts: number = parseInt(
    process.env.QUEUE_MAX_RETRIES || '3',
    10,
  );

  readonly retryBackoffDelay: number = parseInt(
    process.env.QUEUE_RETRY_DELAY || '2000',
    10,
  );

  readonly maxRetryDelay: number = parseInt(
    process.env.QUEUE_MAX_RETRY_DELAY || '60000',
    10,
  );

  
  // JOB LIFECYCLE CONFIGURATION
  readonly completedJobTTL: number = parseInt(
    process.env.QUEUE_COMPLETED_TTL || '3600000',
    10,
  );

  readonly failedJobTTL: number = parseInt(
    process.env.QUEUE_FAILED_TTL || '86400000',
    10,
  );

  readonly jobTimeout: number = parseInt(
    process.env.QUEUE_JOB_TIMEOUT || '300000',
    10,
  );

  readonly rateLimitMax: number = parseInt(
    process.env.QUEUE_RATE_LIMIT_MAX || '100',
    10,
  );

  readonly rateLimitDuration: number = parseInt(
    process.env.QUEUE_RATE_LIMIT_DURATION || '10000',
    10,
  );

  getAttendanceJobOptions(
    priority: number = 5,
    options?: Partial<JobOptions>,
  ): JobOptions {
    return {
      // Job priority in queue (lower number = higher priority)
      priority,

      // Retry configuration
      attempts: this.maxRetryAttempts,
      backoff: {
        type: 'exponential',
        delay: this.retryBackoffDelay,
      },

      // Auto-cleanup configuration
      removeOnComplete: {
        age: this.completedJobTTL, // Remove after 1 hour
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: this.failedJobTTL, // Remove after 24 hours
        count: 500, // Keep max 500 failed jobs for inspection
      },

      // Job timeout
      timeout: this.jobTimeout,

      // Allow custom overrides (merged last, takes precedence)
      ...options,
    };
  }

  isBackpressureTriggered(currentSize: number): boolean {
    return currentSize >= this.maxQueueSize;
  }

  shouldWarnBackpressure(currentSize: number): boolean {
    const threshold = this.maxQueueSize * this.backpressureWarningThreshold;
    return currentSize >= threshold;
  }

  logConfiguration(): void {
    this.logger.log('Queue Configuration Loaded:');
    this.logger.log(`  Max Queue Size: ${this.maxQueueSize}`);
    this.logger.log(`  Max Retry Attempts: ${this.maxRetryAttempts}`);
    this.logger.log(`  Retry Backoff Delay: ${this.retryBackoffDelay}ms`);
    this.logger.log(`  Completed Job TTL: ${this.completedJobTTL}ms`);
    this.logger.log(`  Failed Job TTL: ${this.failedJobTTL}ms`);
    this.logger.log(`  Job Timeout: ${this.jobTimeout}ms`);
    this.logger.log(`  Rate Limit: ${this.rateLimitMax} jobs / ${this.rateLimitDuration}ms`);
  }
}