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
  
  // ============================================
  // QUEUE SERVICE
  // ============================================
  
  /**
   * QueueService - Main service for dispatching jobs to Redis queue
   * 
   * Architecture Compliance (from PDF Section 2.1):
   * "A thin, high-performance wrapper around BullMQ. It exposes an 
   * optimized method to push uniform execution payloads directly into 
   * Redis memory."
   * 
   * Responsibilities:
   * 1. Add jobs to Redis queue with proper options
   * 2. Check backpressure before adding jobs
   * 3. Fallback to disk when Redis unavailable
   * 4. Provide queue management operations (pause/resume)
   * 5. Expose simple API for other modules
   * 
   * Compilation Boundaries:
   * - Can only reference primitive types in job payloads
   * - Cannot import reconciliation/ or payroll/ modules
   * - Receives raw data without processing content
   * - Acts as transport layer only
   * 
   * NOT Responsible For:
   * - Processing/consuming jobs (that's reconciliation/ module)
   * - Business logic (that's attendance/, roster/ modules)
   * - Health monitoring (that's QueueHealthService)
   * - Disk fallback (that's FallbackDiskWriterService)
   */
  @Injectable()
  export class QueueService implements OnModuleInit {
    
    // ==========================================
    // LOGGER INSTANCE
    // ==========================================
    
    /**
     * Dedicated logger for queue operations
     * 
     * Log format: [QueueService] <message>
     * Helps filter queue-specific logs in production
     */
    private readonly logger = new Logger(QueueService.name);
  
    // ==========================================
    // CONSTRUCTOR - DEPENDENCY INJECTION
    // ==========================================
    
    /**
     * Inject dependencies via NestJS DI container
     * 
     * @param attendanceQueue - BullMQ queue instance for attendance processing
     * @param queueConfig - Configuration provider
     * @param healthService - Health monitoring service
     * @param fallbackWriter - Disk fallback service
     */
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
  
    // ==========================================
    // LIFECYCLE HOOKS
    // ==========================================
  
    /**
     * Initialize queue service on application startup
     * 
     * Runs once when NestJS application starts
     * Called after all modules are initialized
     */
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
  
    // ==========================================
    // PUBLIC METHODS - JOB DISPATCH
    // ==========================================
  
    /**
     * Add attendance ingestion job to queue
     * 
     * This is the PRIMARY method used by attendance/ module
     * 
     * Flow:
     * 1. attendance/ module receives webhook from ZKTeco terminal
     * 2. attendance/ saves raw log to AttendanceLog table
     * 3. attendance/ calls THIS method to queue background processing
     * 4. Queue stores job in Redis
     * 5. reconciliation/ worker picks up job and processes
     * 
     * @param payload - Job data (userId, date, tenantId)
     * @param priority - Optional priority (1=highest, 10=lowest, default=5)
     * @returns Promise resolving to BullMQ Job object
     * 
     * @throws ServiceUnavailableException if queue at capacity
     * 
     * Usage Example:
     * ```typescript
     * // In attendance/ module after saving log to database
     * await this.queueService.addAttendanceJob({
     *   tenantId: log.tenantId,
     *   userId: log.userId,
     *   date: log.timestamp.toISOString().split('T')[0],
     *   createdAt: new Date().toISOString(),
     *   attendanceLogId: log.id,
     * });
     * ```
     */
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
        
        // STEP 6: Handle Redis failure (PDF requirement)
        // From PDF Section 2.1: "If Redis goes down, this module must 
        // log a critical alert and fall back to writing temporary 
        // payload logs directly to the local disk space"
        
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
  
    /**
     * Add batch of attendance jobs (for bulk operations)
     * 
     * Used by:
     * - Cron jobs (nightly reconciliation of missed logs)
     * - Admin tools (bulk reprocessing)
     * - Data migration scripts
     * 
     * @param payloads - Array of job payloads
     * @param priority - Priority for all jobs (default: 7 = low priority)
     * @returns Array of created Job objects
     * 
     * Why bulk method?
     * - More efficient than calling addAttendanceJob() in loop
     * - Single Redis pipeline (faster)
     * - Atomic operation (all succeed or all fail)
     * 
     * Usage Example:
     * ```typescript
     * // In jobs/ module for nightly reconciliation
     * const missedLogs = await this.findMissedLogs();
     * const payloads = missedLogs.map(log => ({
     *   tenantId: log.tenantId,
     *   userId: log.userId,
     *   date: log.date,
     *   createdAt: new Date().toISOString(),
     *   processingMode: 'batch',
     * }));
     * 
     * await this.queueService.addAttendanceJobsBulk(payloads, 7);
     * ```
     */
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
  
    // ==========================================
    // PUBLIC METHODS - QUEUE MANAGEMENT
    // ==========================================
  
    /**
     * Pause queue processing
     * 
     * Use cases:
     * - Emergency maintenance window
     * - Database migration in progress
     * - Debugging production issue
     * - Throttle load during infrastructure issue
     * 
     * Effects:
     * - Jobs remain in queue but workers stop processing
     * - New jobs can still be added
     * - Resume with resumeQueue()
     * 
     * Access control:
     * - Should only be callable by SUPER_ADMIN role
     * - Log who paused the queue for audit trail
     * 
     * Usage Example:
     * ```typescript
     * // In admin controller
     * @Post('queue/pause')
     * @Roles(UserRole.SUPER_ADMIN)
     * async pauseQueue(@CurrentUser() admin: User) {
     *   await this.queueService.pauseQueue();
     *   return { message: 'Queue paused', pausedBy: admin.email };
     * }
     * ```
     */
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
  
    /**
     * Resume queue processing after pause
     * 
     * Effects:
     * - Workers resume processing waiting jobs
     * - Queue returns to normal operation
     * 
     * Usage Example:
     * ```typescript
     * @Post('queue/resume')
     * @Roles(UserRole.SUPER_ADMIN)
     * async resumeQueue(@CurrentUser() admin: User) {
     *   await this.queueService.resumeQueue();
     *   return { message: 'Queue resumed', resumedBy: admin.email };
     * }
     * ```
     */
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
  
    /**
     * Clear all completed jobs from queue
     * 
     * WARNING: This permanently deletes job data
     * Only use if:
     * - Completed jobs already processed successfully
     * - Job results saved to PostgreSQL
     * - No need to inspect completed job history
     * 
     * Use cases:
     * - Manual cleanup after TTL expiration disabled
     * - Free up Redis memory
     * - Clean slate for testing
     * 
     * Access control:
     * - Should only be callable by SUPER_ADMIN role
     */
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
  
    /**
     * Clear all failed jobs from queue
     * 
     * WARNING: This permanently deletes failed job data
     * Only use AFTER:
     * - Extracting failed job logs for analysis
     * - Identifying root cause of failures
     * - Fixing underlying issue
     * - Manually reprocessing if needed
     * 
     * Use cases:
     * - Cleanup after resolving systemic failure
     * - Free up Redis memory
     * - Reset queue state after incident
     * 
     * Access control:
     * - Should only be callable by SUPER_ADMIN role
     */
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
  
    /**
     * Get specific job by ID
     * 
     * @param jobId - BullMQ job ID
     * @returns Job object or null if not found
     * 
     * Use cases:
     * - Admin dashboard job inspection
     * - Debugging specific failed job
     * - Checking job status from correlation ID
     * 
     * Usage Example:
     * ```typescript
     * @Get('jobs/:id')
     * async getJobDetails(@Param('id') jobId: string) {
     *   const job = await this.queueService.getJob(jobId);
     *   if (!job) throw new NotFoundException('Job not found');
     *   return {
     *     id: job.id,
     *     status: await job.getState(),
     *     data: job.data,
     *     progress: job.progress,
     *   };
     * }
     * ```
     */
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
  
    /**
     * Retry a specific failed job
     * 
     * @param jobId - BullMQ job ID
     * 
     * Use cases:
     * - Manual retry after fixing underlying issue
     * - Admin intervention for specific failure
     * - Testing fix without full queue retry
     * 
     * Usage Example:
     * ```typescript
     * @Post('jobs/:id/retry')
     * @Roles(UserRole.SUPER_ADMIN)
     * async retryJob(@Param('id') jobId: string) {
     *   await this.queueService.retryJob(jobId);
     *   return { message: 'Job queued for retry' };
     * }
     * ```
     */
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
  
    /**
     * Remove a specific job from queue
     * 
     * @param jobId - BullMQ job ID
     * 
     * Use cases:
     * - Cancel stuck job
     * - Remove invalid job
     * - Admin cleanup
     * 
     * WARNING: Permanently deletes job
     */
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
  
    // ==========================================
    // PUBLIC METHODS - MONITORING
    // ==========================================
  
    /**
     * Get current queue size (waiting jobs count)
     * 
     * @returns Number of jobs waiting to be processed
     * 
     * Used for:
     * - Quick capacity check
     * - Metrics collection
     * - Dashboard widgets
     */
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
  
    /**
     * Check if queue is paused
     * 
     * @returns true if queue is paused
     */
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