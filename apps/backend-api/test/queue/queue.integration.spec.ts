// Location: apps/backend-api/test/queue/queue.integration.spec.ts

// ============================================
// IMPORTS SECTION
// ============================================

import { Test, TestingModule } from '@nestjs/testing';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { promises as fs } from 'fs';

import Queue from 'bull';

// Services under test
import { QueueService } from '../../src/queue/queue.service';
import { QueueConfig } from '../../src/queue/queue.config';
import { QueueHealthService } from '../../src/queue/queue.health.service';
import { FallbackDiskWriterService } from '../../src/queue/fallback-disk-writer.service';

// Constants and interfaces
import { QUEUE_NAMES } from '../../src/queue/constants/queue-names.constants';
import { IAttendanceIngestionJob } from '../../src/queue/interfaces';

// Test infrastructure
import { TestContainersManager } from '../setup/test-containers.setup';

// ============================================
// TEST SUITE DECLARATION
// ============================================

describe('🔌 Queue Service - Real Infrastructure Integration', () => {
  
  // ==========================================
  // TEST FIXTURES (SHARED STATE)
  // ==========================================
  
  let module: TestingModule;
  let queueService: QueueService;
  let queueConfig: QueueConfig;
  let healthService: QueueHealthService;
  let fallbackWriter: FallbackDiskWriterService;
  let containersManager: TestContainersManager;

  // Connection details (populated by containers)
  let redisHost: string;
  let redisPort: number;

  // Test data (fake UUIDs - NO database validation needed)
  const testTenantId = 'fake-tenant-uuid-12345678';
  const testUserId = 'fake-user-uuid-87654321';
  const testDate = '2026-06-02';

  // ==========================================
  // SETUP HOOK - RUNS ONCE BEFORE ALL TESTS
  // ==========================================
  
  beforeAll(async () => {
    
    console.log('\n🔌 Starting queue service integration tests...\n');

    // Create container manager
    containersManager = new TestContainersManager();
    
    console.log('🐳 Starting Redis test container...');
    const redis = await containersManager.startRedis();
    redisHost = redis.host;
    redisPort = redis.port;
    console.log(`✅ Redis started: ${redisHost}:${redisPort}`);

    // Set environment variables
    process.env.REDIS_HOST = redisHost;
    process.env.REDIS_PORT = redisPort.toString();
    process.env.FALLBACK_DIR = '/tmp/chronos-queue-integration-test';

    console.log('🏗️  Building NestJS test module...');

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        
        BullModule.forRoot({
          redis: {
            host: redisHost,
            port: redisPort,
          },
        }),
        
        BullModule.registerQueue({
          name: QUEUE_NAMES.ATTENDANCE_PROCESSING,
        }),
      ],
      providers: [
        QueueService,
        QueueConfig,
        QueueHealthService,
        FallbackDiskWriterService,
      ],
    }).compile();

    queueService = module.get<QueueService>(QueueService);
    queueConfig = module.get<QueueConfig>(QueueConfig);
    healthService = module.get<QueueHealthService>(QueueHealthService);
    fallbackWriter = module.get<FallbackDiskWriterService>(FallbackDiskWriterService);

    await fallbackWriter.onModuleInit();
    await queueService.onModuleInit();

    console.log('\n✅ Test environment ready!\n');
    
  }, 120000);

  // ==========================================
  // CLEANUP HOOK - RUNS ONCE AFTER ALL TESTS
  // ==========================================
  
  afterAll(async () => {
    
    console.log('\n🧹 Cleaning up queue integration tests...\n');

    if (module) {
      await module.close();
    }

    if (containersManager) {
      await containersManager.stopAll();
    }

    try {
      await fs.rm('/tmp/chronos-queue-integration-test', { 
        recursive: true,
        force: true
      });
    } catch (error) {
      // Ignore
    }

    console.log('✅ Cleanup complete!\n');
  }, 60000);

  // ==========================================
  // RESET HOOK - RUNS BEFORE EACH TEST
  // ==========================================
  
  beforeEach(async () => {
    
    const queue = new Queue(QUEUE_NAMES.ATTENDANCE_PROCESSING, {
      redis: { 
        host: redisHost,
        port: redisPort
      },
    });
    
    try {
      await queue.empty();
      await queue.clean(0, 'completed');
      await queue.clean(0, 'failed');
    } catch (error) {
      // Ignore cleanup errors
    } finally {
      await queue.close();
    }

    // Clean fallback files
    try {
      const fallbackDir = '/tmp/chronos-queue-integration-test';
      await fs.rm(fallbackDir, { recursive: true, force: true });
      await fs.mkdir(fallbackDir, { recursive: true });
    } catch (error) {
      // Ignore
    }
  }, 15000); // Increase timeout to 15 seconds

  // ==========================================
  // TEST GROUP 1: JOB DISPATCH OPERATIONS
  // ==========================================
  
  describe('📤 Job Dispatch', () => {
    
    it('should successfully add job to Redis queue', async () => {
      
      const payload: IAttendanceIngestionJob = {
        tenantId: testTenantId,
        userId: testUserId,
        date: testDate,
        createdAt: new Date().toISOString(),
        correlationId: 'test-correlation-001',
      };

      const job = await queueService.addAttendanceJob(payload);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(payload);

      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(1);
    });

    it('should respect job priority', async () => {
      
      const lowPriorityJob = await queueService.addAttendanceJob(
        {
          tenantId: testTenantId,
          userId: testUserId,
          date: testDate,
          createdAt: new Date().toISOString(),
        },
        10,
      );

      const highPriorityJob = await queueService.addAttendanceJob(
        {
          tenantId: testTenantId,
          userId: testUserId,
          date: testDate,
          createdAt: new Date().toISOString(),
        },
        1,
      );

      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(2);

      expect(lowPriorityJob.opts.priority).toBe(10);
      expect(highPriorityJob.opts.priority).toBe(1);
    });

    it('should add bulk jobs efficiently', async () => {
      
      const payloads: IAttendanceIngestionJob[] = Array.from({ length: 50 }).map((_, i) => ({
        tenantId: testTenantId,
        userId: testUserId,
        date: testDate,
        createdAt: new Date().toISOString(),
        correlationId: `bulk-${i}`,
      }));

      const startTime = Date.now();
      const jobs = await queueService.addAttendanceJobsBulk(payloads, 5);
      const duration = Date.now() - startTime;

      expect(jobs).toHaveLength(50);
      expect(duration).toBeLessThan(5000);

      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(50);
    });
  });

  // ==========================================
  // TEST GROUP 2: BACKPRESSURE PROTECTION
  // ==========================================
  
  describe('🚦 Backpressure Protection', () => {
    
    it('should reject jobs when queue at capacity', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Fill queue to max capacity
      const maxSize = queueConfig.maxQueueSize;
      const payloads = Array.from({ length: maxSize }).map((_, i) => ({
        tenantId: testTenantId,
        userId: `user-${i}`,
        date: testDate,
        createdAt: new Date().toISOString(),
      }));

      await queueService.addAttendanceJobsBulk(payloads, 5);

      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(maxSize);

      // Attempt to add one more - should fail
      const extraPayload: IAttendanceIngestionJob = {
        tenantId: testTenantId,
        userId: 'extra-user',
        date: testDate,
        createdAt: new Date().toISOString(),
      };

      await expect(queueService.addAttendanceJob(extraPayload))
        .rejects
        .toThrow('Queue is at capacity');

      jest.restoreAllMocks();
    });

    it('should allow jobs when queue has capacity', async () => {
      
      const isBackpressure = await healthService.isBackpressureActive();
      expect(isBackpressure).toBe(false);

      const payload: IAttendanceIngestionJob = {
        tenantId: testTenantId,
        userId: testUserId,
        date: testDate,
        createdAt: new Date().toISOString(),
      };

      const job = await queueService.addAttendanceJob(payload);
      expect(job).toBeDefined();
      
      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(1);
    });
  });

  // ==========================================
  // TEST GROUP 3: FALLBACK OPERATIONS
  // ==========================================
  
  describe('💾 Disk Fallback on Redis Failure', () => {
    
    it('should track fallback statistics', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await fallbackWriter.writeJobToDisk(
        QUEUE_NAMES.ATTENDANCE_PROCESSING,
        {
          tenantId: testTenantId,
          userId: testUserId,
          date: testDate,
          createdAt: new Date().toISOString(),
        },
      );

      const stats = await fallbackWriter.getFallbackStats();

      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.requiresRecovery).toBe(true);
      expect(stats.queueBreakdown).toHaveProperty(QUEUE_NAMES.ATTENDANCE_PROCESSING);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 4: QUEUE MANAGEMENT OPERATIONS
  // ==========================================
  
  describe('⚙️ Queue Management Operations', () => {
    
    it('should pause and resume queue', async () => {
      
      await queueService.pauseQueue();
      
      let isPaused = await queueService.isPaused();
      expect(isPaused).toBe(true);

      await queueService.resumeQueue();
      
      isPaused = await queueService.isPaused();
      expect(isPaused).toBe(false);
    });

    it('should retrieve job by ID', async () => {
      
      const addedJob = await queueService.addAttendanceJob({
        tenantId: testTenantId,
        userId: testUserId,
        date: testDate,
        createdAt: new Date().toISOString(),
      });

      const retrievedJob = await queueService.getJob(addedJob.id as string);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.id).toBe(addedJob.id);
      expect(retrievedJob?.data.userId).toBe(testUserId);
    });

    it('should remove job from queue', async () => {
      
      const job = await queueService.addAttendanceJob({
        tenantId: testTenantId,
        userId: testUserId,
        date: testDate,
        createdAt: new Date().toISOString(),
      });

      let queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(1);

      await queueService.removeJob(job.id as string);

      queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(0);
    });
  });

  // ==========================================
  // TEST GROUP 5: QUEUE MONITORING
  // ==========================================
  
  describe('📊 Queue Monitoring', () => {
    
    it('should get accurate queue size', async () => {
      
      let size = await queueService.getQueueSize();
      expect(size).toBe(0);

      const payloads = Array.from({ length: 5 }).map((_, i) => ({
        tenantId: testTenantId,
        userId: `user-${i}`,
        date: testDate,
        createdAt: new Date().toISOString(),
      }));

      await queueService.addAttendanceJobsBulk(payloads, 5);

      size = await queueService.getQueueSize();
      expect(size).toBe(5);
    });

    it('should accurately report pause status', async () => {
      
      let isPaused = await queueService.isPaused();
      expect(isPaused).toBe(false);

      await queueService.pauseQueue();

      isPaused = await queueService.isPaused();
      expect(isPaused).toBe(true);

      await queueService.resumeQueue();

      isPaused = await queueService.isPaused();
      expect(isPaused).toBe(false);
    });
  });

  // ==========================================
  // TEST GROUP 6: CONCURRENT OPERATIONS
  // ==========================================
  
  describe('⚡ Concurrent Operations', () => {
    
    it('should handle concurrent job additions', async () => {
      
      const payloads = Array.from({ length: 20 }).map((_, i) => ({
        tenantId: testTenantId,
        userId: `user-${i}`,
        date: testDate,
        createdAt: new Date().toISOString(),
      }));

      const jobs = await Promise.all(
        payloads.map(payload => queueService.addAttendanceJob(payload))
      );

      expect(jobs).toHaveLength(20);

      const queueSize = await queueService.getQueueSize();
      expect(queueSize).toBe(20);
    });
  });

  // ==========================================
  // TEST GROUP 7: ERROR HANDLING
  // ==========================================
  
  describe('🛡️ Error Handling', () => {
    
    it('should handle empty bulk job array', async () => {
      
      const jobs = await queueService.addAttendanceJobsBulk([]);

      expect(jobs).toEqual([]);
    });

    it('should return null for non-existent job', async () => {
      
      const job = await queueService.getJob('non-existent-id');

      expect(job).toBeNull();
    });
  });
});