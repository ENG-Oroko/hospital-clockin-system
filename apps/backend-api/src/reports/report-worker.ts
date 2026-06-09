import { NestFactory } from '@nestjs/core';
import { Worker } from 'bullmq';
import { ReportsModule } from './reports.module';
import { ReportsService } from './reports.service';
import { ReportExportJobPayload, ReportQueryDTO } from './reports.types';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

function parseRedisConnection(url: string) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

function validateJobData(jobData: unknown): ReportExportJobPayload {
  if (!jobData || typeof jobData !== 'object') {
    throw new Error('Invalid report export job payload. Expected object.');
  }

  const payload = jobData as Record<string, unknown>;
  const tenantId = payload.tenantId;
  const generatedById = payload.generatedById;
  const query = payload.query;

  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('Invalid or missing tenantId.');
  }
  if (typeof generatedById !== 'string' || generatedById.trim() === '') {
    throw new Error('Invalid or missing generatedById.');
  }
  if (!query || typeof query !== 'object') {
    throw new Error('Invalid or missing query payload.');
  }

  return { tenantId, generatedById, query: query as ReportQueryDTO };
}

async function processJob(jobData: unknown, reportsService: ReportsService) {
  const payload = validateJobData(jobData);
  await reportsService.generateReportDirect(payload.tenantId, payload.generatedById, payload.query);
}

async function main() {
  const appContext = await NestFactory.createApplicationContext(ReportsModule);
  const reportsService = appContext.get(ReportsService);
  const connection = parseRedisConnection(REDIS_URL);

  const worker = new Worker<ReportExportJobPayload>(
    'reports:exports',
    async (job) => {
      await processJob(job.data, reportsService);
    },
    { connection },
  );

  worker.on('completed', (job) => {
    console.log('Report export job completed:', job.id);
  });

  worker.on('failed', (job, err) => {
    console.error('Report export job failed:', job?.id, err);
  });

  worker.on('error', (error) => {
    console.error('Report worker error', error);
  });

  const shutdown = async () => {
    try {
      await worker.close();
      await appContext.close();
    } catch (err) {
      console.error('Report worker shutdown error', err);
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('Report worker listening for jobs...');
}

main().catch((err) => {
  console.error('Failed to start report worker', err);
  process.exit(1);
});
