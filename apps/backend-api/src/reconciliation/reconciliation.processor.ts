import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ATTENDANCE_JOB_NAMES, QUEUE_NAMES } from '../queue/constants/queue-names.constants';
import type { IAttendanceIngestionJob, IAttendanceReconciliationJob } from '../queue/interfaces';
import { ReconciliationService } from './reconciliation.service';

@Injectable()
@Processor(QUEUE_NAMES.ATTENDANCE_PROCESSING)
export class ReconciliationProcessor {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Process(ATTENDANCE_JOB_NAMES.PROCESS_LOG)
  async processAttendanceLog(job: Job<IAttendanceIngestionJob>) {
    const { tenantId, userId, date } = job.data;
    await this.reconciliationService.reconcileUserDate(tenantId, userId, date, {
      actorUserId: userId,
      reason: `Queue processing for attendance log ${job.data.attendanceLogId ?? 'unknown'}`,
    });
  }

  @Process(ATTENDANCE_JOB_NAMES.BATCH_RECONCILE)
  async processBatchReconcile(job: Job<IAttendanceReconciliationJob>) {
    const { tenantId, employeeId, departmentId, startDate, endDate, triggeredByUserId } = job.data;
    this.logger.log(`Processing batch reconciliation job ${job.id} for tenant ${tenantId}`);
    await this.reconciliationService.reconcileDateRange(tenantId, startDate, endDate, {
      employeeId,
      departmentId,
      actorUserId: triggeredByUserId,
      reason: 'Queue batch reconciliation',
    });
  }
}
