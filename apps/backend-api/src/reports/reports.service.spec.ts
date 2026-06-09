jest.mock('./document-compiler', () => ({
  DocumentCompiler: jest.fn().mockImplementation(() => ({})),
}));

import { BadRequestException } from '@nestjs/common';
import { ReportsService, REPORT_TYPES, type ReportQueryDTO } from './reports.service';
import { ReportsRepository } from './reports.repositories';
import { StreamQueryProcessor } from './stream-query-processor';
import type { ReportsQueueService } from './reports-queue.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockRepo: Partial<ReportsRepository>;
  let mockStream: Partial<StreamQueryProcessor>;
  let mockQueue: Partial<ReportsQueueService>;

  beforeEach(() => {
    mockRepo = {
      saveCompiledReport: jest.fn().mockResolvedValue({}),
      getRosterAssignmentOverrides: jest.fn().mockResolvedValue({}),
    };

    mockStream = {
      streamAttendanceSummaries: jest.fn().mockImplementation(async function* () {}),
    };

    mockQueue = {
      enqueueExportJob: jest.fn().mockResolvedValue('job-123'),
    };

    service = new ReportsService(
      mockRepo as ReportsRepository,
      mockStream as StreamQueryProcessor,
      {} as any,
      mockQueue as ReportsQueueService,
    );
  });

  const makeQuery = (reportType: ReportQueryDTO['reportType']): ReportQueryDTO => ({
    reportType,
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  });

  it('should queue export jobs when the date range exceeds the realtime threshold', async () => {
    const query: ReportQueryDTO = {
      reportType: REPORT_TYPES.MONTHLY_ATTENDANCE,
      startDate: '2024-01-01',
      endDate: '2024-08-01',
    };

    const result = await service.generateReport('tenant-1', 'user-1', query);

    expect(mockQueue.enqueueExportJob).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      generatedById: 'user-1',
      query,
    });
    expect(result).toEqual({ queued: true, jobId: 'job-123' });
  });

  it('should reject invalid date ranges with a BadRequestException', async () => {
    const query: ReportQueryDTO = {
      reportType: REPORT_TYPES.MONTHLY_ATTENDANCE,
      startDate: '2024-08-01',
      endDate: '2024-01-01',
    };

    await expect(service.generateReport('tenant-1', 'user-1', query)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe('generateReport dispatch', () => {
    const cases: Array<{ reportType: ReportQueryDTO['reportType']; methodName: string }> = [
      { reportType: REPORT_TYPES.MONTHLY_ATTENDANCE, methodName: 'generateAttendanceReport' },
      { reportType: REPORT_TYPES.DEPARTMENT_SUMMARY, methodName: 'generateDepartmentSummaryReport' },
      { reportType: REPORT_TYPES.OVERTIME_AUDIT, methodName: 'generateOvertimeAuditReport' },
      { reportType: REPORT_TYPES.LATENESS_AUDIT, methodName: 'generateLatenessAuditReport' },
      { reportType: REPORT_TYPES.ABSENCE_AUDIT, methodName: 'generateAbsenceAuditReport' },
      { reportType: REPORT_TYPES.SHIFT_COMPLIANCE, methodName: 'generateShiftComplianceReport' },
      { reportType: REPORT_TYPES.PAYROLL_READY, methodName: 'generatePayrollReadyReport' },
      { reportType: REPORT_TYPES.LEAVE_ATTENDANCE_RECONCILIATION, methodName: 'generateLeaveAttendanceReconciliationReport' },
      { reportType: REPORT_TYPES.DEVICE_HEALTH, methodName: 'generateDeviceHealthReport' },
      { reportType: REPORT_TYPES.TURNOVER_HEADCOUNT, methodName: 'generateTurnoverHeadcountReport' },
      { reportType: REPORT_TYPES.SCHEDULED_ACTUAL_HOURS, methodName: 'generateScheduledActualHoursReport' },
      { reportType: REPORT_TYPES.ATTENDANCE_AUDIT_TRAIL, methodName: 'generateAuditTrailReport' },
    ];

    test.each(cases)(
      'should route %s to %s',
      async ({ reportType, methodName }) => {
        const spy = jest
          .spyOn(service as any, methodName)
          .mockResolvedValue({ ok: true });

          const result = await service.generateReport('tenant-1', 'user-1', makeQuery(reportType));
      const [tenantId, generatedById, startDate, endDate] = (spy as jest.Mock).mock.calls[0];

      expect(tenantId).toBe('tenant-1');
      expect(generatedById).toBe('user-1');
      expect(startDate).toEqual(expect.any(Date));
      expect(endDate).toEqual(expect.any(Date));
      expect(result).toEqual({ ok: true });
    },
  );

    it('should throw BadRequestException for an unsupported reportType', async () => {
      const query = { reportType: 'UNSUPPORTED_REPORT' as any, startDate: '2024-01-01', endDate: '2024-01-02' };
      await expect(service.generateReport('tenant-1', 'user-1', query)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generatePayrollReadyReport', () => {
    it('should calculate regular and overtime pay and save compiled report', async () => {
      const batch = [
        {
          userId: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          payrollNumber: 'P001',
          hourlyRate: 10,
          departmentName: 'Cardiology',
          date: new Date('2024-01-01T00:00:00.000Z'),
          status: 'PRESENT',
          firstIn: new Date('2024-01-01T08:00:00.000Z'),
          lastOut: new Date('2024-01-01T17:00:00.000Z'),
          totalHours: 9,
          lateMinutes: 0,
          overtimeHours: 1,
          shiftName: 'Day',
          scheduledHours: 8,
        },
      ];

      (mockStream.streamAttendanceSummaries as jest.Mock).mockImplementation(async function* () {
        yield batch;
      });
      (mockRepo.getRosterAssignmentOverrides as jest.Mock).mockResolvedValue({
        'user-1:2024-01-01': 10,
      });

      await (service as any).generatePayrollReadyReport(
        'tenant-1',
        'user-1',
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-01-02T00:00:00.000Z'),
      );

      expect(mockRepo.getRosterAssignmentOverrides).toHaveBeenCalledWith('tenant-1', [
        { userId: 'user-1', date: expect.any(Date) },
      ]);
      expect(mockRepo.saveCompiledReport).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        REPORT_TYPES.PAYROLL_READY,
        expect.any(Date),
        expect.any(Date),
        expect.objectContaining({
          rows: [
            expect.objectContaining({
              employeeId: 'user-1',
              regularHours: 8,
              overtimeHours: 1,
              regularPay: 80,
              overtimePay: 15,
              grossPay: 95,
            }),
          ],
        }),
      );
    });
  });
});
