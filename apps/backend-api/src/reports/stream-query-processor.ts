import { Injectable, Logger } from '@nestjs/common';
import { ReportsRepository } from './reports.repositories';

/**
 * StreamQueryProcessor
 * - Thin wrapper around ReportsRepository streaming helpers.
 * - Provides a single place to switch to DB cursor-based streaming later.
 * - Emits AsyncGenerator batches of rows to keep memory usage flat.
 */
@Injectable()
export class StreamQueryProcessor {
  private readonly logger = new Logger(StreamQueryProcessor.name);

  constructor(private readonly repo: ReportsRepository) {}

  async *streamAttendanceSummaries(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
    batchSize = 100,
  ) {
    // Delegate to repository streaming (cursor-style or skip/take implementation)
    for await (const batch of this.repo.streamAttendanceSummaries(
      tenantId,
      startDate,
      endDate,
      departmentId,
      userId,
      batchSize,
    )) {
      yield batch;
    }
  }

  async *streamOvertimeAudit(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    batchSize = 100,
  ) {
    for await (const batch of this.repo.streamOvertimeAudit(
      tenantId,
      startDate,
      endDate,
      departmentId,
      batchSize,
    )) {
      yield batch;
    }
  }

  async *streamLatenessAudit(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    batchSize = 100,
  ) {
    for await (const batch of this.repo.streamLatenessAudit(
      tenantId,
      startDate,
      endDate,
      departmentId,
      batchSize,
    )) {
      yield batch;
    }
  }

  async *streamAbsenceAudit(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    batchSize = 100,
  ) {
    for await (const batch of this.repo.streamAbsenceAudit(
      tenantId,
      startDate,
      endDate,
      departmentId,
      batchSize,
    )) {
      yield batch;
    }
  }
}
