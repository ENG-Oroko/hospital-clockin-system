import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type{ Queue } from 'bull';
import { QUEUE_NAMES } from './constants/queue-names.constants';
import { QueueConfig } from './queue.config';
import { FallbackDiskWriterService } from './fallback-disk-writer.service';
import { IAttendanceIngestionJob } from './interfaces';


import { getErrorMessage, getErrorStack } from './helpers';

export enum QueueHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical',
}

export interface IQueueHealthMetrics {
  // Overall status
  status: QueueHealthStatus;
  healthScore: number; // 0-100

  // Queue metrics
  metrics: {
    waiting: number;      // Jobs waiting to be processed
    active: number;       // Jobs currently being processed
    completed: number;    // Successfully completed jobs
    failed: number;       // Failed jobs
    delayed: number;      // Scheduled for future
    paused: boolean;      // Queue manually paused
  };

  // Capacity metrics
  capacity: {
    current: number;           // Current waiting jobs
    max: number;               // Maximum allowed
    utilizationPercent: number; // Percentage used
    availableSlots: number;    // Remaining capacity
  };

  // Performance metrics
  performance: {
    averageProcessingTime: number | null; // ms
    jobsProcessedPerMinute: number | null;
    oldestWaitingJobAge: number | null;   // ms
  };

  // Fallback status
  fallback: {
    active: boolean;        // Is fallback mode active?
    fileCount: number;      // Number of fallback files
    oldestFileAge: number | null; // Age of oldest file (ms)
    requiresRecovery: boolean;
  };

  // Metadata
  timestamp: string;        // ISO 8601 timestamp
  redisConnected: boolean;  // Redis connection status
}

@Injectable()
export class QueueHealthService {
  
  private readonly logger = new Logger(QueueHealthService.name);

  constructor(
    // Inject attendance processing queue
    @InjectQueue(QUEUE_NAMES.ATTENDANCE_PROCESSING)
    private readonly attendanceQueue: Queue<IAttendanceIngestionJob>,

    // Inject configuration
    private readonly queueConfig: QueueConfig,

    // Inject fallback service
    private readonly fallbackWriter: FallbackDiskWriterService,
  ) {}

  async getHealthMetrics(): Promise<IQueueHealthMetrics> {
    
    try {
      
      // STEP 1: Fetch queue counts from Redis
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.attendanceQueue.getWaitingCount(),
        this.attendanceQueue.getActiveCount(),
        this.attendanceQueue.getCompletedCount(),
        this.attendanceQueue.getFailedCount(),
        this.attendanceQueue.getDelayedCount(),
      ]);

      // STEP 2: Check queue pause status
      const isPaused = await this.attendanceQueue.isPaused();

      // STEP 3: Calculate capacity metrics
      const utilizationPercent = (waiting / this.queueConfig.maxQueueSize) * 100;
      const availableSlots = this.queueConfig.maxQueueSize - waiting;

      // STEP 4: Get performance metrics
      const performance = await this.getPerformanceMetrics();

      // STEP 5: Get fallback status
      const fallbackStats = await this.fallbackWriter.getFallbackStats();

      // STEP 6: Calculate health score (0-100)
      const healthScore = this.calculateHealthScore(
        waiting,
        active,
        failed,
        fallbackStats.totalFiles,
      );

      // STEP 7: Determine overall status
      const status = this.determineHealthStatus(
        healthScore,
        fallbackStats.totalFiles > 0,
      );

      // STEP 8: Assemble complete metrics
      return {
        status,
        healthScore,
        metrics: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused: isPaused,
        },
        capacity: {
          current: waiting,
          max: this.queueConfig.maxQueueSize,
          utilizationPercent: Math.round(utilizationPercent),
          availableSlots,
        },
        performance,
        fallback: {
          active: fallbackStats.totalFiles > 0,
          fileCount: fallbackStats.totalFiles,
          oldestFileAge: fallbackStats.oldestFileAge,
          requiresRecovery: fallbackStats.requiresRecovery,
        },
        timestamp: new Date().toISOString(),
        redisConnected: true, // If we got here, Redis is connected
      };

    } catch (error) {
      
      // Redis connection error - return degraded metrics
      this.logger.error(
        `Failed to get queue health metrics: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

        return this.getErrorMetrics(getErrorMessage(error));
    }
  }

  async isBackpressureActive(): Promise<boolean> {
    
    try {
      
      const waitingCount = await this.attendanceQueue.getWaitingCount();
      return this.queueConfig.isBackpressureTriggered(waitingCount);

    } catch (error) {
      
      // If Redis is down, assume backpressure active (fail safe)
      this.logger.error(`Failed to check backpressure: ${getErrorMessage(error)}`);
      return true
    }
  }

  async shouldWarnBackpressure(): Promise<boolean> {
    
    try {
      
      const waitingCount = await this.attendanceQueue.getWaitingCount();
      return this.queueConfig.shouldWarnBackpressure(waitingCount);

    } catch (error) {
       this.logger.error(`Failed to check warning threshold: ${getErrorMessage(error)}`);
      return true;
    }
  }

  private calculateHealthScore(
    waiting: number,
    active: number,
    failed: number,
    fallbackFiles: number,
  ): number {
    
    let score = 100;

    // Deduct for queue congestion (up to -40 points)
    const congestionRatio = waiting / this.queueConfig.maxQueueSize;
    score -= congestionRatio * 40;

    // Deduct for failed jobs (up to -30 points)
    const totalJobs = waiting + active + failed || 1; // Avoid division by zero
    const failureRatio = failed / totalJobs;
    score -= failureRatio * 30;

    // Deduct for fallback files (up to -30 points)
    // Each fallback file indicates Redis was down
    const fallbackPenalty = Math.min(fallbackFiles / 100, 1) * 30;
    score -= fallbackPenalty;

    // Ensure score stays in valid range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private determineHealthStatus(
    healthScore: number,
    hasFallbackFiles: boolean,
  ): QueueHealthStatus {
    
    // Critical: Fallback files present (Redis was/is down)
    if (hasFallbackFiles) {
      return QueueHealthStatus.CRITICAL;
    }

    // Unhealthy: Score below 40
    if (healthScore < 40) {
      return QueueHealthStatus.UNHEALTHY;
    }

    // Degraded: Score 40-70
    if (healthScore < 70) {
      return QueueHealthStatus.DEGRADED;
    }

    // Healthy: Score 70+
    return QueueHealthStatus.HEALTHY;
  }

  private async getPerformanceMetrics(): Promise<{
    averageProcessingTime: number | null;
    jobsProcessedPerMinute: number | null;
    oldestWaitingJobAge: number | null;
  }> {
    
    try {
      
      // Get completed jobs from last hour for performance calculation
      const oneHourAgo = Date.now() - 3600000;
      const recentCompleted = await this.attendanceQueue.getCompleted(0, 100);

      // Calculate average processing time
      let totalProcessingTime = 0;
      let processedCount = 0;

      for (const job of recentCompleted) {
        if (job.finishedOn && job.processedOn) {
          totalProcessingTime += job.finishedOn - job.processedOn;
          processedCount++;
        }
      }

      const averageProcessingTime = processedCount > 0
        ? Math.round(totalProcessingTime / processedCount)
        : null;

      // Calculate jobs processed per minute
      const jobsProcessedPerMinute = processedCount > 0
        ? Math.round((processedCount / 60) * 10) / 10 // Round to 1 decimal
        : null;

      // Get oldest waiting job age
      const waitingJobs = await this.attendanceQueue.getWaiting(0, 1);
      const oldestWaitingJobAge = waitingJobs.length > 0 && waitingJobs[0].timestamp
        ? Date.now() - waitingJobs[0].timestamp
        : null;

      return {
        averageProcessingTime,
        jobsProcessedPerMinute,
        oldestWaitingJobAge,
      };

    } catch (error) {
      
     this.logger.warn(`Failed to get performance metrics: ${getErrorMessage(error)}`);
      
      return {
        averageProcessingTime: null,
        jobsProcessedPerMinute: null,
        oldestWaitingJobAge: null,
      };
    }
  }

  private getErrorMetrics(errorMessage: string): IQueueHealthMetrics {
    
    return {
      status: QueueHealthStatus.CRITICAL,
      healthScore: 0,
      metrics: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      },
      capacity: {
        current: 0,
        max: this.queueConfig.maxQueueSize,
        utilizationPercent: 0,
        availableSlots: 0,
      },
      performance: {
        averageProcessingTime: null,
        jobsProcessedPerMinute: null,
        oldestWaitingJobAge: null,
      },
      fallback: {
        active: true,
        fileCount: 0,
        oldestFileAge: null,
        requiresRecovery: false,
      },
      timestamp: new Date().toISOString(),
      redisConnected: false,
    };
  }
}