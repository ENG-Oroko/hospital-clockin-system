import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, QueueScheduler, QueueOptions } from 'bullmq';
import { REPORT_TYPES, ReportExportJobPayload, ReportType } from './reports.types';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

function parseRedisConnection(url: string): QueueOptions['connection'] {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

@Injectable()
export class ReportsQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ReportsQueueService.name);
  private queue?: Queue;
  private scheduler?: QueueScheduler;

  private initQueue() {
    if (this.queue && this.scheduler) return;

    const connection = parseRedisConnection(REDIS_URL);
    this.queue = new Queue('reports:exports', { connection });
    this.scheduler = new QueueScheduler('reports:exports', { connection });

    this.queue.on('error', (error) => {
      this.logger.error('Redis queue error', error);
    });

    this.scheduler.on('error', (error) => {
      this.logger.error('Redis scheduler error', error);
    });
  }

  async enqueueExportJob(payload: ReportExportJobPayload): Promise<string> {
    this.validateJobPayload(payload);
    this.initQueue();
    if (!this.queue) throw new Error('Queue not initialized');

    const job = await this.queue.add('export-report', payload, {
      removeOnComplete: true,
      removeOnFail: false,
    });
    return String(job.id);
  }

  async getJobStatus(jobId: string): Promise<{ id: string; state: string; failedReason?: string } | null> {
    this.initQueue();
    if (!this.queue) return null;

    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: String(job.id),
      state,
      failedReason: job.failedReason ?? undefined,
    };
  }

  private validateJobPayload(payload: ReportExportJobPayload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid job payload.');
    }
    if (!payload.tenantId || typeof payload.tenantId !== 'string') {
      throw new Error('tenantId is required for export jobs.');
    }
    if (!payload.generatedById || typeof payload.generatedById !== 'string') {
      throw new Error('generatedById is required for export jobs.');
    }
    if (!payload.query || typeof payload.query !== 'object') {
      throw new Error('query payload is required for export jobs.');
    }
    if (!payload.query.reportType || typeof payload.query.reportType !== 'string') {
      throw new Error('query.reportType is required for export jobs.');
    }
    if (!Object.values(REPORT_TYPES).includes(payload.query.reportType as ReportType)) {
      throw new Error(
        `query.reportType must be one of: ${Object.values(REPORT_TYPES).join(', ')}.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.scheduler) {
      await this.scheduler.close();
    }
  }
}
