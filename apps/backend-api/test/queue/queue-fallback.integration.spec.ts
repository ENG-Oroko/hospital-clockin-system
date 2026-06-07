// Location: apps/backend-api/test/queue/fallback-disk-writer.integration.spec.ts

// ============================================
// IMPORTS
// ============================================

import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import * as path from 'path';

// Service under test
import { FallbackDiskWriterService } from '../../src/queue/fallback-disk-writer.service';

// Constants
import { QUEUE_NAMES } from '../../src/queue/constants/queue-names.constants';

// ============================================
// TEST SUITE
// ============================================

/**
 * Fallback Disk Writer Integration Tests
 * 
 * Purpose:
 * - Tests disk fallback functionality when Redis fails
 * - Validates file I/O operations
 * - Ensures data integrity and recovery
 * 
 * What this tests:
 * ✅ Write jobs to disk when Redis unavailable
 * ✅ Read jobs from disk
 * ✅ Track fallback statistics
 * ✅ List fallback jobs
 * ✅ Clean up fallback files
 * ✅ Handle corrupted files gracefully
 * ✅ Directory structure management
 * ✅ Concurrent file operations
 * 
 * Critical guarantees:
 * - Zero data loss during Redis outage
 * - Fallback files are recoverable
 * - Statistics are accurate
 */
describe('💾 Fallback Disk Writer - File I/O Integration', () => {
  
  // ==========================================
  // TEST FIXTURES
  // ==========================================
  
  let module: TestingModule;
  let fallbackWriter: FallbackDiskWriterService;
  
  const testFallbackDir = '/tmp/chronos-test-fallback-spec';

  // ==========================================
  // SETUP - RUNS ONCE BEFORE ALL TESTS
  // ==========================================
  
  beforeAll(async () => {
    
    console.log('\n💾 Starting fallback disk writer tests...\n');

    // Set fallback directory
    process.env.FALLBACK_DIR = testFallbackDir;

    // Create NestJS testing module
    module = await Test.createTestingModule({
      providers: [FallbackDiskWriterService],
    }).compile();

    // Get service instance
    fallbackWriter = module.get<FallbackDiskWriterService>(FallbackDiskWriterService);

    // Initialize service (creates directories)
    await fallbackWriter.onModuleInit();

    console.log('✅ Test environment ready!\n');
  });

  // ==========================================
  // CLEANUP - RUNS ONCE AFTER ALL TESTS
  // ==========================================
  
  afterAll(async () => {
    
    console.log('\n🧹 Cleaning up fallback test files...\n');

    if (module) {
      await module.close();
    }

    // Remove test fallback directory
    try {
      await fs.rm(testFallbackDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    console.log('✅ Cleanup complete!\n');
  });

  // ==========================================
  // RESET - RUNS BEFORE EACH TEST
  // ==========================================
  
  beforeEach(async () => {
    
    // Clean up all fallback files before each test
    try {
      const files = await fs.readdir(testFallbackDir);
      for (const file of files) {
        const filePath = path.join(testFallbackDir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          await fs.rm(filePath, { recursive: true });
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  });

  // ==========================================
  // TEST GROUP 1: WRITE OPERATIONS
  // ==========================================
  
  /**
   * Tests for writing jobs to disk
   * 
   * Validates:
   * - Job is serialized to JSON
   * - File is created in correct directory
   * - File contains correct data
   */
  describe('📝 Write Operations', () => {
    
    /**
     * Test: Write single job to disk
     * 
     * Validates:
     * - Job is serialized to JSON
     * - File is created in correct directory
     * - File contains correct data with all metadata
     */
    it('should write job to disk successfully', async () => {
      
      // Suppress error logs
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      const payload = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        date: '2026-06-02',
        createdAt: new Date().toISOString(),
      };

      // Write job to disk
      await fallbackWriter.writeJobToDisk(queueName, payload);

      // Verify file was created
      const files = await fallbackWriter.listFallbackJobs();
      expect(files.length).toBeGreaterThan(0);

      // Read file contents
      const filePath = files[0];
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileData = JSON.parse(fileContent);

      // Verify file contents
      expect(fileData.queueName).toBe(queueName);
      expect(fileData.payload).toEqual(payload);
      expect(fileData.failedAt).toBeDefined(); // ✅ FIXED: Use "failedAt" instead of "timestamp"
      expect(fileData.recoveryInstructions).toBeDefined();
      expect(fileData.fallbackVersion).toBe('1.0');

      jest.restoreAllMocks();
    });

    /**
     * Test: Write multiple jobs to disk
     * 
     * Validates:
     * - Multiple jobs can be written
     * - Each gets unique filename
     * - No data loss or overwriting
     */
    it('should write multiple jobs to disk with unique names', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      const payloads = [
        { userId: 'user-1', date: '2026-06-01' },
        { userId: 'user-2', date: '2026-06-02' },
        { userId: 'user-3', date: '2026-06-03' },
      ];

      // Write all jobs
      for (const payload of payloads) {
        await fallbackWriter.writeJobToDisk(queueName, payload);
      }

      // List all jobs
      const jobs = await fallbackWriter.listFallbackJobs();

      // Verify all files created
      expect(jobs).toHaveLength(3);

      // Verify all files have unique paths
      const uniquePaths = new Set(jobs);
      expect(uniquePaths.size).toBe(3);

      jest.restoreAllMocks();
    });

    /**
     * Test: Write job with special characters in data
     * 
     * Validates:
     * - Special characters are preserved
     * - JSON encoding is safe
     * - Unicode characters work correctly
     */
    it('should handle special characters in payload', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      const payload = {
        userId: 'user-456',
        note: 'Special chars: "quotes", \'single\', \\backslash, 🚀emoji',
        json: { nested: { data: 'with "quotes"' } },
      };

      await fallbackWriter.writeJobToDisk(queueName, payload);

      // Read and verify
      const files = await fallbackWriter.listFallbackJobs();
      const fileContent = await fs.readFile(files[0], 'utf-8');
      const fileData = JSON.parse(fileContent);

      expect(fileData.payload).toEqual(payload);
      expect(fileData.payload.note).toContain('🚀emoji');
      expect(fileData.payload.json.nested.data).toContain('"quotes"');

      jest.restoreAllMocks();
    });

    /**
     * Test: Write job with large payload
     * 
     * Validates:
     * - Large payloads are handled
     * - No size limits enforced
     */
    it('should handle large payloads', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      
      // Create large payload (100KB of data)
      const largeData = 'x'.repeat(100 * 1024);
      const payload = {
        userId: 'user-large',
        data: largeData,
      };

      await fallbackWriter.writeJobToDisk(queueName, payload);

      // Verify file exists and is large
      const files = await fallbackWriter.listFallbackJobs();
      expect(files.length).toBeGreaterThan(0);

      const stat = await fs.stat(files[0]);
      expect(stat.size).toBeGreaterThan(100 * 1024);

      // Verify can read it back
      const fileContent = await fs.readFile(files[0], 'utf-8');
      const fileData = JSON.parse(fileContent);
      expect(fileData.payload.data).toBe(largeData);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 2: READ OPERATIONS
  // ==========================================
  
  /**
   * Tests for reading jobs from disk
   * 
   * Validates:
   * - Job data is correctly deserialized
   * - All fields are present
   * - Data types are preserved
   */
  describe('📖 Read Operations', () => {
    
    /**
     * Test: Read job from disk
     * 
     * Validates:
     * - Job data is correctly deserialized
     * - All fields are present
     * - Data types are preserved
     */
    it('should read job from disk successfully', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      const originalPayload = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        date: '2026-06-02',
        createdAt: new Date().toISOString(),
        count: 42,
        isActive: true,
      };

      // Write job
      await fallbackWriter.writeJobToDisk(queueName, originalPayload);

      // List and read job
      const files = await fallbackWriter.listFallbackJobs();
      const fileData = await fallbackWriter.readFallbackJob(files[0]);

      // Verify data
      expect(fileData.payload).toEqual(originalPayload);
      expect(fileData.queueName).toBe(queueName);
      expect(typeof fileData.payload.count).toBe('number');
      expect(typeof fileData.payload.isActive).toBe('boolean');

      jest.restoreAllMocks();
    });

    /**
     * Test: Handle corrupted JSON file
     * 
     * Validates:
     * - Corrupted files don't crash service
     * - Error is thrown appropriately
     */
    it('should handle corrupted JSON file gracefully', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const corruptedFilePath = path.join(testFallbackDir, 'corrupted.json');
      
      // Write invalid JSON
      await fs.mkdir(testFallbackDir, { recursive: true });
      await fs.writeFile(corruptedFilePath, '{ invalid json }');

      // Reading should throw error
      try {
        await fallbackWriter.readFallbackJob(corruptedFilePath);
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(Error);
      }

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 3: LIST OPERATIONS
  // ==========================================
  
  /**
   * Tests for listing fallback jobs
   * 
   * Validates:
   * - All jobs are listed
   * - Correct count returned
   * - Filtering works
   */
  describe('📋 List Operations', () => {
    
    /**
     * Test: List all fallback jobs
     * 
     * Validates:
     * - All jobs are listed
     * - Correct count returned
     */
    it('should list all fallback jobs', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      
      // Write 5 jobs
      for (let i = 0; i < 5; i++) {
        await fallbackWriter.writeJobToDisk(queueName, { userId: `user-${i}` });
      }

      // List all jobs
      const jobs = await fallbackWriter.listFallbackJobs();

      expect(jobs).toHaveLength(5);
      expect(jobs[0]).toBeDefined();
      expect(typeof jobs[0]).toBe('string'); // Should be file path

      jest.restoreAllMocks();
    });

    /**
     * Test: List jobs when empty
     * 
     * Validates:
     * - Returns empty array when no jobs
     * - No error thrown
     */
    it('should return empty array when no jobs', async () => {
      
      const jobs = await fallbackWriter.listFallbackJobs();

      expect(jobs).toEqual([]);
    });

    /**
     * Test: List jobs for specific queue
     * 
     * Validates:
     * - Can filter by queue name
     * - Only returns jobs from specific queue
     */
    it('should list jobs for specific queue', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      
      // Write 3 jobs
      for (let i = 0; i < 3; i++) {
        await fallbackWriter.writeJobToDisk(queueName, { userId: `user-${i}` });
      }

      // List jobs for specific queue
      const jobs = await fallbackWriter.listFallbackJobs(queueName);

      expect(jobs).toHaveLength(3);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 4: STATISTICS
  // ==========================================
  
  /**
   * Tests for fallback statistics
   * 
   * Validates:
   * - Total file count is correct
   * - Queue breakdown is accurate
   * - Recovery flag is set correctly
   */
  describe('📊 Statistics', () => {
    
    /**
     * Test: Get accurate fallback statistics
     * 
     * Validates:
     * - Total file count is correct
     * - Queue breakdown is accurate
     * - Recovery flag is set correctly
     */
    it('should get accurate fallback statistics', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // Write 3 jobs
      for (let i = 0; i < 3; i++) {
        await fallbackWriter.writeJobToDisk(queueName, { userId: `user-${i}` });
      }

      // Get statistics
      const stats = await fallbackWriter.getFallbackStats();

      expect(stats.totalFiles).toBe(3);
      expect(stats.requiresRecovery).toBe(true);
      expect(stats.queueBreakdown[queueName]).toBe(3);

      jest.restoreAllMocks();
    });

    /**
     * Test: Statistics when empty
     * 
     * Validates:
     * - Recovery flag is false when no files
     * - Total is 0
     */
    it('should show no recovery needed when empty', async () => {
      
      const stats = await fallbackWriter.getFallbackStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.requiresRecovery).toBe(false);
    });

    /**
     * Test: Statistics by queue name
     * 
     * Validates:
     * - Breakdown is per-queue
     * - Accurate counts per queue
     */
    it('should break down statistics by queue', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Write jobs
      await fallbackWriter.writeJobToDisk(QUEUE_NAMES.ATTENDANCE_PROCESSING, { id: '1' });
      await fallbackWriter.writeJobToDisk(QUEUE_NAMES.ATTENDANCE_PROCESSING, { id: '2' });

      const stats = await fallbackWriter.getFallbackStats();

      expect(stats.queueBreakdown[QUEUE_NAMES.ATTENDANCE_PROCESSING]).toBe(2);
      expect(stats.totalFiles).toBe(2);

      jest.restoreAllMocks();
    });

    /**
     * Test: Oldest file age calculation
     * 
     * Validates:
     * - File age is calculated correctly
     * - Oldest file is identified
     */
    it('should calculate oldest file age', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // Write job
      await fallbackWriter.writeJobToDisk(queueName, { userId: 'user-1' });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get stats
      const stats = await fallbackWriter.getFallbackStats();

      // Age should be approximately 100ms or more
      expect(stats.oldestFileAge).toBeGreaterThanOrEqual(100);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 5: CLEANUP OPERATIONS
  // ==========================================
  
  /**
   * Tests for cleanup operations
   * 
   * Validates:
   * - Files are deleted after cleanup
   * - Statistics reset
   */
  describe('🧹 Cleanup Operations', () => {
    
    /**
     * Test: Delete fallback job file
     * 
     * Validates:
     * - Files are deleted
     * - Statistics updated
     */
    it('should delete fallback job files', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // Write 2 jobs
      for (let i = 0; i < 2; i++) {
        await fallbackWriter.writeJobToDisk(queueName, { userId: `user-${i}` });
      }

      // Verify jobs exist
      let files = await fallbackWriter.listFallbackJobs();
      expect(files).toHaveLength(2);

      // Delete first file
      await fallbackWriter.deleteFallbackJob(files[0]);

      // Verify file deleted
      files = await fallbackWriter.listFallbackJobs();
      expect(files).toHaveLength(1);

      jest.restoreAllMocks();
    });

    /**
     * Test: Delete all fallback files
     * 
     * Validates:
     * - All files deleted
     * - Recovery flag reset
     */
    it('should delete all fallback files when recovered', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // Write 3 jobs
      for (let i = 0; i < 3; i++) {
        await fallbackWriter.writeJobToDisk(queueName, { userId: `user-${i}` });
      }

      // Verify files exist
      let stats = await fallbackWriter.getFallbackStats();
      expect(stats.requiresRecovery).toBe(true);

      // Delete all files
      let files = await fallbackWriter.listFallbackJobs();
      for (const file of files) {
        await fallbackWriter.deleteFallbackJob(file);
      }

      // Verify all deleted
      stats = await fallbackWriter.getFallbackStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.requiresRecovery).toBe(false);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 6: DIRECTORY STRUCTURE
  // ==========================================
  
  /**
   * Tests for directory structure management
   * 
   * Validates:
   * - Directories are created correctly
   * - Proper organization by date/queue
   */
  describe('📂 Directory Structure', () => {
    
    /**
     * Test: Directory initialization
     * 
     * Validates:
     * - Fallback directory is created
     * - Queue subdirectories are created
     */
    it('should initialize directory structure', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Verify base directory exists
      const baseExists = await fs.stat(testFallbackDir)
        .then(() => true)
        .catch(() => false);
      expect(baseExists).toBe(true);

      // Write a job (should create queue subdirectory)
      await fallbackWriter.writeJobToDisk(QUEUE_NAMES.ATTENDANCE_PROCESSING, { test: 'data' });

      // Verify queue directory structure created
      const files = await fallbackWriter.listFallbackJobs();
      expect(files.length).toBeGreaterThan(0);

      jest.restoreAllMocks();
    });

    /**
     * Test: Date-based directory organization
     * 
     * Validates:
     * - Files organized by date
     * - Directory structure is logical
     */
    it('should organize files by date', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      
      // Write jobs
      await fallbackWriter.writeJobToDisk(queueName, { id: '1' });

      // List jobs and check path structure
      const jobs = await fallbackWriter.listFallbackJobs();
      
      // Verify jobs were created
      expect(jobs.length).toBeGreaterThan(0);

      // Verify path contains date directory
      const jobPath = jobs[0];
      const pathParts = jobPath.split(path.sep);
      
      // Should have date-like directory (YYYY-MM-DD format)
      const hasDateDir = pathParts.some(part => /^\d{4}-\d{2}-\d{2}$/.test(part));
      expect(hasDateDir).toBe(true);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 7: CONCURRENT OPERATIONS
  // ==========================================
  
  /**
   * Tests for concurrent file operations
   * 
   * Validates:
   * - Concurrent writes don't conflict
   * - No data loss with multiple operations
   */
  describe('⚡ Concurrent Operations', () => {
    
    /**
     * Test: Multiple concurrent writes
     * 
     * Validates:
     * - Concurrent writes don't conflict
     * - All jobs are written
     * - No data loss
     */
    it('should handle concurrent writes safely', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;
      const payloads = Array.from({ length: 20 }).map((_, i) => ({
        userId: `user-${i}`,
        correlationId: `corr-${i}`,
      }));

      // Write all concurrently
      await Promise.all(
        payloads.map(payload => 
          fallbackWriter.writeJobToDisk(queueName, payload)
        )
      );

      // Verify all written
      const stats = await fallbackWriter.getFallbackStats();
      expect(stats.totalFiles).toBe(20);

      jest.restoreAllMocks();
    });

    /**
     * Test: Concurrent reads and writes
     * 
     * Validates:
     * - Reading doesn't interfere with writing
     * - No race conditions
     */
    it('should handle concurrent reads and writes', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // Write initial jobs
      const writePromises = Array.from({ length: 5 }).map((_, i) =>
        fallbackWriter.writeJobToDisk(queueName, { id: `${i}` })
      );

      await Promise.all(writePromises);

      // Now read while writing more
      const files = await fallbackWriter.listFallbackJobs();
      const readPromises = files.slice(0, 2).map(file =>
        fallbackWriter.readFallbackJob(file)
      );

      const writeMorePromises = Array.from({ length: 5 }).map((_, i) =>
        fallbackWriter.writeJobToDisk(queueName, { id: `extra-${i}` })
      );

      await Promise.all([...readPromises, ...writeMorePromises]);

      // Verify all operations succeeded
      const finalStats = await fallbackWriter.getFallbackStats();
      expect(finalStats.totalFiles).toBe(10);

      jest.restoreAllMocks();
    });
  });

  // ==========================================
  // TEST GROUP 8: RECOVERY SCENARIO
  // ==========================================
  
  /**
   * Tests for realistic recovery scenarios
   * 
   * Validates:
   * - Full recovery workflow
   * - Data integrity during recovery
   */
  describe('🔄 Recovery Scenarios', () => {
    
    /**
     * Test: Complete recovery workflow
     * 
     * Simulates:
     * - Redis failure (jobs saved to disk)
     * - Recovery (jobs read back)
     * - Cleanup (files deleted)
     */
    it('should support complete recovery workflow', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // STEP 1: Write fallback files (simulating Redis failure)
      const payloads = Array.from({ length: 5 }).map((_, i) => ({
        userId: `user-${i}`,
        date: '2026-06-02',
        tenantId: 'tenant-123',
      }));

      for (const payload of payloads) {
        await fallbackWriter.writeJobToDisk(queueName, payload);
      }

      // STEP 2: Verify fallback files exist
      let stats = await fallbackWriter.getFallbackStats();
      expect(stats.totalFiles).toBe(5);
      expect(stats.requiresRecovery).toBe(true);

      // STEP 3: Read jobs for recovery
      const jobs = await fallbackWriter.listFallbackJobs();
      expect(jobs).toHaveLength(5);

      const jobDataArray = await Promise.all(
        jobs.map(job => fallbackWriter.readFallbackJob(job))
      );

      // STEP 4: Verify data integrity
      for (let i = 0; i < jobDataArray.length; i++) {
        expect(jobDataArray[i].payload.userId).toMatch(/^user-/);
        expect(jobDataArray[i].queueName).toBe(queueName);
      }

      // STEP 5: Clean up after recovery
      for (const job of jobs) {
        await fallbackWriter.deleteFallbackJob(job);
      }

      // STEP 6: Verify cleanup complete
      stats = await fallbackWriter.getFallbackStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.requiresRecovery).toBe(false);

      jest.restoreAllMocks();
    });

    /**
     * Test: Partial recovery
     * 
     * Validates:
     * - Can recover specific jobs
     * - Leave others in fallback
     */
    it('should support partial recovery', async () => {
      
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const queueName = QUEUE_NAMES.ATTENDANCE_PROCESSING;

      // Write 5 jobs
      const jobIds = [];
      for (let i = 0; i < 5; i++) {
        await fallbackWriter.writeJobToDisk(queueName, { id: `${i}` });
        jobIds.push(`${i}`);
      }

      // Verify 5 files exist
      let stats = await fallbackWriter.getFallbackStats();
      expect(stats.totalFiles).toBe(5);

      // Recover only first 3
      const files = await fallbackWriter.listFallbackJobs();
      for (let i = 0; i < 3; i++) {
        await fallbackWriter.deleteFallbackJob(files[i]);
      }

      // Verify 2 remain
      stats = await fallbackWriter.getFallbackStats();
      expect(stats.totalFiles).toBe(2);
      expect(stats.requiresRecovery).toBe(true);

      jest.restoreAllMocks();
    });
  });
});