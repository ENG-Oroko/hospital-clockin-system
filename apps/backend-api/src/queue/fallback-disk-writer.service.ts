import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
// ✅ Import helpers (clean barrel import)
import { 
  getErrorMessage, 
  getErrorStack,
  formatErrorLog,
  isTransientError,
} from './helpers';

@Injectable()
export class FallbackDiskWriterService implements OnModuleInit {
  
  private readonly logger = new Logger(FallbackDiskWriterService.name);

  private readonly fallbackDir: string = 
    process.env.FALLBACK_DIR || '/tmp/chronos-queue-fallback';

  private readonly maxFileAge: number = parseInt(
    process.env.FALLBACK_MAX_FILE_AGE || '3600000',
    10,
  );

  private readonly maxFileCount: number = parseInt(
    process.env.FALLBACK_MAX_FILE_COUNT || '10000',
    10,
  );

  async onModuleInit(): Promise<void> {
    try {
      
      await fs.mkdir(this.fallbackDir, { 
        recursive: true, 
        mode: 0o755 
      });

      this.logger.log(`✅ Fallback storage initialized: ${this.fallbackDir}`);

      // STEP 2: Check for existing fallback files (from previous crashes)
      await this.checkExistingFallbackFiles();

      // STEP 3: Create recovery instructions file if not exists
      await this.createRecoveryInstructions();

       } catch (error) {
      this.logger.error(
        `❌ Failed to initialize fallback storage: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
    }
  }

  async writeJobToDisk(queueName: string, payload: any): Promise<void> {
    
    try {
      
      // STEP 1: Create date-based subdirectory
      // Organizes files by date for easier recovery
      // Example: /tmp/chronos-queue-fallback/2026-06-02/
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dateDir = join(this.fallbackDir, today);
      
      await fs.mkdir(dateDir, { recursive: true });

      // STEP 2: Create queue-specific subdirectory
      // Separates different queue types
      // Example: /tmp/chronos-queue-fallback/2026-06-02/attendance-processing/
      const queueDir = join(dateDir, queueName);
      
      await fs.mkdir(queueDir, { recursive: true });

      // STEP 3: Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 hex chars
      const filename = `job-${timestamp}-${randomSuffix}.json`;
      const filepath = join(queueDir, filename);

      // STEP 4: Prepare fallback data structure
      // Include metadata for recovery process
      const fallbackData = {
        // Original job data
        queueName,
        payload,
        
        // Metadata for recovery
        failedAt: new Date().toISOString(),
        hostname: process.env.HOSTNAME || 'unknown',
        nodeEnv: process.env.NODE_ENV || 'unknown',
        
        // Recovery instructions
        recoveryInstructions: 'Use CLI: npm run queue:recover-fallback',
        
        // Version info for compatibility
        fallbackVersion: '1.0',
      };

      // STEP 5: Write to disk
      // JSON.stringify with indent=2 for human readability
      await fs.writeFile(
        filepath,
        JSON.stringify(fallbackData, null, 2),
        'utf8',
      );

      // STEP 6: Log critical alert
      // This should trigger monitoring alerts (PagerDuty, etc.)
      this.logger.error(
        `🚨 CRITICAL: Redis unavailable. Job saved to disk fallback.\n` +
        `  Queue: ${queueName}\n` +
        `  File: ${filepath}\n` +
        `  Payload: ${JSON.stringify(payload).substring(0, 100)}...`,
      );

      // STEP 7: Check if fallback directory is getting too large
      await this.checkFallbackCapacity(queueDir);

    } catch (error) {
      
      // STEP 8: Ultimate failure - can't save to Redis OR disk
      // This is catastrophic - log everything we can
      this.logger.error(
        `💥 CRITICAL FAILURE: Cannot save job to Redis OR disk!\n` +
        `  Queue: ${queueName}\n` +
        `  Error: ${getErrorMessage(error)}\n` +
        `  Job data: ${JSON.stringify(payload)}\n` +
        `  THIS JOB IS LOST - MANUAL INTERVENTION REQUIRED`,
        getErrorStack(error),
      );


    }
  }

  async listFallbackJobs(queueName?: string): Promise<string[]> {
    
    try {
      
      const allFiles: string[] = [];

      // Read all date directories
      const dateDirs = await fs.readdir(this.fallbackDir);

      for (const dateDir of dateDirs) {
        
        // Skip non-directory entries (like recovery-instructions.md)
        const dateDirPath = join(this.fallbackDir, dateDir);
        const stat = await fs.stat(dateDirPath);
        if (!stat.isDirectory()) continue;

        // Read queue directories within date
        const queueDirs = await fs.readdir(dateDirPath);

        for (const queueDir of queueDirs) {
          
          // If specific queue requested, skip others
          if (queueName && queueDir !== queueName) continue;

          const queueDirPath = join(dateDirPath, queueDir);
          const queueStat = await fs.stat(queueDirPath);
          if (!queueStat.isDirectory()) continue;

          // Read all JSON files in queue directory
          const files = await fs.readdir(queueDirPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              allFiles.push(join(queueDirPath, file));
            }
          }
        }
      }

      return allFiles;

    } catch (error) {
      
      this.logger.error(`Failed to list fallback jobs: ${getErrorMessage(error)}`, getErrorStack(error));
      return [];
    }
  }

  async readFallbackJob(filepath: string): Promise<any> {
    
    try {
      
      const fileContent = await fs.readFile(filepath, 'utf8');
      const jobData = JSON.parse(fileContent);
      
      return jobData;

    } catch (error) {
      
      this.logger.error(
        `Failed to read fallback job: ${filepath}\n` +
        `Error: ${getErrorMessage(error)}`,
      );
      throw error;
      
    }
  }

  
  // Delete a fallback job file after successful recovery
  
  async deleteFallbackJob(filepath: string): Promise<void> {
    
    try {
      
      await fs.unlink(filepath);
      this.logger.log(`Deleted recovered fallback job: ${filepath}`);

    } catch (error) {
      
      this.logger.warn(
        `Failed to delete fallback job: ${filepath}\n` +
        `Error: ${getErrorMessage(error)}`,
      );
    }
  }

  async getFallbackStats(): Promise<{
    totalFiles: number;
    oldestFileAge: number | null;
    queueBreakdown: Record<string, number>;
    requiresRecovery: boolean;
  }> {
    
    try {
      
      const allFiles = await this.listFallbackJobs();
      
      let oldestTimestamp: number | null = null;
      const queueBreakdown: Record<string, number> = {};

      for (const filepath of allFiles) {
        
        // Extract timestamp from filename
        // Format: job-1717340000000-a3b2.json
        const filename = filepath.split('/').pop() || '';
        const timestampMatch = filename.match(/job-(\d+)-/);
        
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1], 10);
          
          if (!oldestTimestamp || timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp;
          }
        }

        // Extract queue name from path
        // Format: .../2026-06-02/attendance-processing/job-...
        const pathParts = filepath.split('/');
        const queueName = pathParts[pathParts.length - 2];
        
        queueBreakdown[queueName] = (queueBreakdown[queueName] || 0) + 1;
      }

      const now = Date.now();
      const oldestFileAge = oldestTimestamp ? now - oldestTimestamp : null;

      return {
        totalFiles: allFiles.length,
        oldestFileAge,
        queueBreakdown,
        requiresRecovery: allFiles.length > 0,
      };

    } catch (error) {
      
      this.logger.error(`Failed to get fallback stats: ${getErrorMessage(error)}`);
      return {
        totalFiles: 0,
        oldestFileAge: null,
        queueBreakdown: {},
        requiresRecovery: false,
      };
    }
  }

  private async checkExistingFallbackFiles(): Promise<void> {
    
    try {
      
      const stats = await this.getFallbackStats();

      if (stats.totalFiles > 0) {
        
        // Alert: Unrecovered fallback files detected
        this.logger.warn(
          `⚠️ ATTENTION: ${stats.totalFiles} unrecovered fallback jobs detected!\n` +
          `  Oldest file age: ${stats.oldestFileAge ? Math.floor(stats.oldestFileAge / 1000 / 60) : '?'} minutes\n` +
          `  Queue breakdown: ${JSON.stringify(stats.queueBreakdown)}\n` +
          `  Action required: Run recovery tool → npm run queue:recover-fallback`,
        );

        // If files are very old, escalate alert
        if (stats.oldestFileAge && stats.oldestFileAge > this.maxFileAge) {
          
          this.logger.error(
            `🚨 CRITICAL: Fallback files older than ${this.maxFileAge / 1000 / 60} minutes!\n` +
            `  This indicates Redis has been down for extended period.\n` +
            `  IMMEDIATE ACTION REQUIRED`,
          );
        }
      }

    } catch (error) {
      
      this.logger.error(
        `Failed to check existing fallback files: ${getErrorMessage(error)}`,
      );
    }
  }

  private async checkFallbackCapacity(queueDir: string): Promise<void> {
    
    try {
      
      const files = await fs.readdir(queueDir);
      const fileCount = files.filter(f => f.endsWith('.json')).length;

      if (fileCount > this.maxFileCount) {
        
        this.logger.error(
          `🚨 CRITICAL: Fallback directory has ${fileCount} files!\n` +
          `  Max allowed: ${this.maxFileCount}\n` +
          `  Directory: ${queueDir}\n` +
          `  Risk: Disk space exhaustion\n` +
          `  Action: Restore Redis immediately OR increase disk capacity`,
        );
      }

    } catch (error) {
      
       this.logger.error(
        `Failed to check fallback capacity: ${getErrorMessage(error)}`,
      );
    }
  }

  private async createRecoveryInstructions(): Promise<void> {
    
    try {
      
      const instructionsPath = join(this.fallbackDir, 'recovery-instructions.md');

      const instructions = `# Queue Fallback Recovery Instructions

## What Happened?

Redis became unavailable, so jobs were written to disk as fallback.

## Directory Structure

\`\`\`
${this.fallbackDir}/
├── 2026-06-02/                    # Date of failure
│   ├── attendance-processing/     # Queue name
│   │   ├── job-1717340000000-a3b2.json
│   │   └── ...
│   └── payroll-calculation/
│       └── ...
└── recovery-instructions.md       # This file
\`\`\`

## Recovery Steps

### 1. Verify Redis is Healthy

\`\`\`bash
redis-cli ping  # Should return "PONG"
\`\`\`

### 2. Run Recovery Tool

\`\`\`bash
npm run queue:recover-fallback
\`\`\`

This will:
- Read all fallback JSON files
- Requeue jobs to Redis
- Archive recovered files to S3
- Delete local fallback files

### 3. Monitor Queue Health

\`\`\`bash
curl http://localhost:3000/health/queue
\`\`\`

Check that jobs are processing normally.

## Manual Recovery (if needed)

If automated recovery fails, manually requeue jobs:

\`\`\`typescript
import { readFileSync } from 'fs';

const jobData = JSON.parse(readFileSync('path/to/job.json', 'utf8'));
await queueService.addAttendanceJob(jobData.payload);
\`\`\`

## Contact

For assistance: ops@hospital-chronos.com
`;

      await fs.writeFile(instructionsPath, instructions, 'utf8');

    } catch (error) {
      
      this.logger.warn(
        `Failed to create recovery instructions: ${getErrorMessage(error)}`,
      );
    }
  }
}