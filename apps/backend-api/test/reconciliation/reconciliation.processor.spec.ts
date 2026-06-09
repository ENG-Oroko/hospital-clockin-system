import { ReconciliationProcessor } from '../../src/reconciliation/reconciliation.processor';
import { ReconciliationService } from '../../src/reconciliation/reconciliation.service';

describe('ReconciliationProcessor queue contract', () => {
  it('consumes process-attendance-log jobs through reconcileUserDate', async () => {
    const reconciliationService = {
      reconcileUserDate: jest.fn().mockResolvedValue({}),
      reconcileDateRange: jest.fn(),
    } as unknown as ReconciliationService;
    const processor = new ReconciliationProcessor(reconciliationService);

    await processor.processAttendanceLog({
      id: 'job-1',
      data: {
        tenantId: 'tenant-1',
        userId: 'employee-1',
        date: '2026-06-03',
        attendanceLogId: 'log-1',
      },
    } as any);

    expect(reconciliationService.reconcileUserDate).toHaveBeenCalledWith(
      'tenant-1',
      'employee-1',
      '2026-06-03',
      expect.objectContaining({
        actorUserId: 'employee-1',
        reason: 'Queue processing for attendance log log-1',
      }),
    );
  });

  it('consumes batch-reconcile-attendance jobs through reconcileDateRange', async () => {
    const reconciliationService = {
      reconcileUserDate: jest.fn(),
      reconcileDateRange: jest.fn().mockResolvedValue({}),
    } as unknown as ReconciliationService;
    const processor = new ReconciliationProcessor(reconciliationService);

    await processor.processBatchReconcile({
      id: 'job-2',
      data: {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        departmentId: 'department-1',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        triggeredByUserId: 'admin-1',
      },
    } as any);

    expect(reconciliationService.reconcileDateRange).toHaveBeenCalledWith(
      'tenant-1',
      '2026-06-01',
      '2026-06-30',
      expect.objectContaining({
        employeeId: 'employee-1',
        departmentId: 'department-1',
        actorUserId: 'admin-1',
        reason: 'Queue batch reconciliation',
      }),
    );
  });
});
