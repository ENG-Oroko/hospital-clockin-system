import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from '../../src/attendance/attendance.service';
import { DepartmentService } from '../../src/department/department.service';
import { EmployeeService } from '../../src/employee/employee.service';
import { RosterService } from '../../src/roster/roster.service';
import { ReconciliationRepository } from '../../src/reconciliation/reconciliation.repository';
import { ReconciliationService } from '../../src/reconciliation/reconciliation.service';

const tenantId = '11111111-1111-1111-1111-111111111111';
const otherTenantId = '22222222-2222-2222-2222-222222222222';
const employeeId = '33333333-3333-3333-3333-333333333333';
const actorUserId = '44444444-4444-4444-4444-444444444444';
const assignmentId = '55555555-5555-5555-5555-555555555555';
const date = '2026-06-03';

const assignment = {
  id: assignmentId,
  tenantId,
  employeeId,
  departmentId: '66666666-6666-6666-6666-666666666666',
  shiftTemplateId: '77777777-7777-7777-7777-777777777777',
  date: new Date(`${date}T00:00:00.000Z`),
  overriddenHourlyRate: null,
  startTimeSnapshot: '08:00',
  endTimeSnapshot: '17:00',
  gracePeriodSnapshot: 15,
  overtimeThresholdSnapshot: 0,
  overnightSnapshot: false,
  department: { id: '66666666-6666-6666-6666-666666666666', code: 'ER', rules: {} },
  employee: { id: employeeId, firstName: 'Amina', lastName: 'Njeri', payrollNumber: 'P-001' },
};

const logs = [
  {
    id: '88888888-8888-8888-8888-888888888888',
    tenantId,
    userId: employeeId,
    deviceId: '99999999-9999-9999-9999-999999999999',
    direction: 'IN',
    timestamp: new Date(`${date}T08:03:00.000Z`),
    device: { id: '99999999-9999-9999-9999-999999999999', name: 'Gate A', serialCode: 'SN-A' },
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    tenantId,
    userId: employeeId,
    deviceId: '99999999-9999-9999-9999-999999999999',
    direction: 'OUT',
    timestamp: new Date(`${date}T17:10:00.000Z`),
    device: { id: '99999999-9999-9999-9999-999999999999', name: 'Gate A', serialCode: 'SN-A' },
  },
];

const reconciliationLog = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  tenantId,
  rosterAssignmentId: assignmentId,
  calculatedBaseHours: 9.12,
  calculatedOvertime: 0.12,
  calculatedNightShift: 0,
  isFlagged: false,
  isResolved: true,
  exceptionReason: null,
};

describe('ReconciliationService unrostered attendance', () => {
  let service: ReconciliationService;
  let attendanceService: { findRawLogsForUserWindow: jest.Mock };
  let employeeService: { assertEmployeeEligible: jest.Mock; getEmployeeLifecycleState: jest.Mock };
  let rosterService: {
    getActiveAssignmentForUserDate: jest.Mock;
    getAssignmentsForDateRange: jest.Mock;
    getAssignmentSnapshot: jest.Mock;
  };
  let repository: {
    upsertAssignmentResult: jest.Mock;
    linkLogsToAssignment: jest.Mock;
    createAudit: jest.Mock;
    findAttendanceLogsForUserDate: jest.Mock;
    findUnrosteredExceptionAudits: jest.Mock;
    findUnrosteredExceptionAuditById: jest.Mock;
    findPayrollReadyRecords: jest.Mock;
  };

  beforeEach(async () => {
    attendanceService = { findRawLogsForUserWindow: jest.fn() };
    employeeService = {
      assertEmployeeEligible: jest.fn().mockResolvedValue({ id: employeeId }),
      getEmployeeLifecycleState: jest.fn().mockResolvedValue({
        isActive: true,
        deletedAt: null,
        employmentStatus: 'ACTIVE',
      }),
    };
    rosterService = {
      getActiveAssignmentForUserDate: jest.fn(),
      getAssignmentsForDateRange: jest.fn(),
      getAssignmentSnapshot: jest.fn(),
    };
    repository = {
      upsertAssignmentResult: jest.fn().mockResolvedValue(reconciliationLog),
      linkLogsToAssignment: jest.fn().mockResolvedValue({ count: logs.length }),
      createAudit: jest.fn().mockResolvedValue({}),
      findAttendanceLogsForUserDate: jest.fn(),
      findUnrosteredExceptionAudits: jest.fn().mockResolvedValue([]),
      findUnrosteredExceptionAuditById: jest.fn(),
      findPayrollReadyRecords: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: AttendanceService, useValue: attendanceService },
        { provide: DepartmentService, useValue: { findOne: jest.fn() } },
        { provide: EmployeeService, useValue: employeeService },
        { provide: RosterService, useValue: rosterService },
        { provide: ReconciliationRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(ReconciliationService);
  });

  it('reconciles attendance with a valid roster assignment into a payroll-ready result', async () => {
    rosterService.getActiveAssignmentForUserDate.mockResolvedValue(assignment);
    attendanceService.findRawLogsForUserWindow.mockResolvedValue(logs);

    const result = await service.reconcileUserDate(tenantId, employeeId, date, { actorUserId });

    expect(repository.upsertAssignmentResult).toHaveBeenCalledWith(
      tenantId,
      assignmentId,
      expect.objectContaining({ isFlagged: false, isResolved: true }),
    );
    expect(repository.linkLogsToAssignment).toHaveBeenCalledWith(
      tenantId,
      logs.map((log) => log.id),
      assignmentId,
    );
    expect(result.reconciliationLog).toEqual(reconciliationLog);
    expect(result.payrollReadyRecord).toMatchObject({
      reconciliationLogId: reconciliationLog.id,
      employeeId,
      rosterAssignmentId: assignmentId,
    });
  });

  it('creates an unrostered reconciliation exception when attendance exists without a roster assignment', async () => {
    rosterService.getActiveAssignmentForUserDate.mockResolvedValue(null);
    repository.findAttendanceLogsForUserDate.mockResolvedValue(logs);

    const result = await service.reconcileUserDate(tenantId, employeeId, date, { actorUserId });

    expect(result.reconciliationLog).toBeNull();
    expect(result.payrollReadyRecord).toBeNull();
    expect(result.summary.status).toBe('UNROSTERED');
    expect(result.exception).toMatchObject({
      tenantId,
      employeeId,
      attendanceDate: date,
      attendanceLogIds: logs.map((log) => log.id),
      outcome: 'UNROSTERED',
      reviewStatus: 'REQUIRES_REVIEW',
      reviewState: 'REQUIRES_REVIEW',
      reason: 'Attendance recorded without roster assignment',
    });
    expect(repository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        actorUserId,
        actionType: 'UNROSTERED_EXCEPTION_CREATED',
        targetLogId: logs[0].id,
        justification: 'Attendance recorded without roster assignment',
      }),
    );
  });

  it('does not return a payroll-ready record for flagged rostered exceptions', async () => {
    rosterService.getActiveAssignmentForUserDate.mockResolvedValue({
      ...assignment,
      startTimeSnapshot: '08:00',
      gracePeriodSnapshot: 0,
    });
    attendanceService.findRawLogsForUserWindow.mockResolvedValue([
      {
        ...logs[0],
        timestamp: new Date(`${date}T08:30:00.000Z`),
      },
      logs[1],
    ]);
    repository.upsertAssignmentResult.mockResolvedValue({
      ...reconciliationLog,
      isFlagged: true,
      isResolved: true,
      exceptionReason: 'LATE_CHECKIN',
    });

    const result = await service.reconcileUserDate(tenantId, employeeId, date, { actorUserId });

    expect(repository.upsertAssignmentResult).toHaveBeenCalledWith(
      tenantId,
      assignmentId,
      expect.objectContaining({
        isFlagged: true,
        isResolved: true,
        exceptionReason: 'LATE_CHECKIN',
      }),
    );
    expect(result.payrollReadyRecord).toBeNull();
  });

  it('reprocesses and clears an unrostered exception after roster correction', async () => {
    const createdAudit = {
      id: 'audit-1',
      tenantId,
      userId: actorUserId,
      actionType: 'UNROSTERED_EXCEPTION_CREATED',
      justification: 'created',
      createdAt: new Date(`${date}T09:00:00.000Z`),
      newValues: {
        exceptionId: 'exception-1',
        tenantId,
        employeeId,
        attendanceDate: date,
        attendanceLogIds: logs.map((log) => log.id),
        devices: [],
        outcome: 'UNROSTERED',
        reviewStatus: 'REQUIRES_REVIEW',
        reviewState: 'REQUIRES_REVIEW',
        reason: 'Attendance recorded without roster assignment',
      },
    };
    repository.findUnrosteredExceptionAuditById.mockResolvedValue([createdAudit]);
    rosterService.getActiveAssignmentForUserDate.mockResolvedValue(assignment);
    attendanceService.findRawLogsForUserWindow.mockResolvedValue(logs);

    const result = await service.reprocessUnrosteredException(tenantId, 'exception-1', actorUserId);

    expect(result.cleared).toBe(true);
    expect(result.result.reconciliationLog).toEqual(reconciliationLog);
    expect(repository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        actorUserId,
        actionType: 'UNROSTERED_EXCEPTION_CLEARED',
        oldValues: expect.objectContaining({ reviewStatus: 'REQUIRES_REVIEW' }),
        newValues: expect.objectContaining({ reviewStatus: 'CLEARED', reconciliationLogId: reconciliationLog.id }),
      }),
    );
  });

  it('audits reprocess attempts that still have no roster correction', async () => {
    const createdAudit = {
      id: 'audit-1',
      tenantId,
      userId: actorUserId,
      actionType: 'UNROSTERED_EXCEPTION_CREATED',
      justification: 'created',
      createdAt: new Date(`${date}T09:00:00.000Z`),
      newValues: {
        exceptionId: 'exception-1',
        tenantId,
        employeeId,
        attendanceDate: date,
        attendanceLogIds: logs.map((log) => log.id),
        devices: [],
        outcome: 'UNROSTERED',
        reviewStatus: 'REQUIRES_REVIEW',
        reviewState: 'REQUIRES_REVIEW',
        reason: 'Attendance recorded without roster assignment',
      },
    };
    repository.findUnrosteredExceptionAuditById.mockResolvedValue([createdAudit]);
    rosterService.getActiveAssignmentForUserDate.mockResolvedValue(null);
    repository.findAttendanceLogsForUserDate.mockResolvedValue(logs);
    repository.findUnrosteredExceptionAudits.mockResolvedValue([createdAudit]);

    const result = await service.reprocessUnrosteredException(tenantId, 'exception-1', actorUserId);

    expect(result.cleared).toBe(false);
    expect(repository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        actorUserId,
        actionType: 'UNROSTERED_EXCEPTION_REPROCESSED',
        oldValues: expect.objectContaining({ reviewStatus: 'REQUIRES_REVIEW' }),
        newValues: expect.objectContaining({
          reviewStatus: 'REQUIRES_REVIEW',
          actionTaken: 'REPROCESS_ATTEMPTED',
        }),
      }),
    );
  });

  it('audits unrostered override approval and keeps it out of payroll', async () => {
    const createdAudit = {
      id: 'audit-1',
      tenantId,
      userId: actorUserId,
      actionType: 'UNROSTERED_EXCEPTION_CREATED',
      justification: 'created',
      createdAt: new Date(`${date}T09:00:00.000Z`),
      newValues: {
        exceptionId: 'exception-1',
        tenantId,
        employeeId,
        attendanceDate: date,
        attendanceLogIds: logs.map((log) => log.id),
        devices: [],
        outcome: 'UNROSTERED',
        reviewStatus: 'REQUIRES_REVIEW',
        reviewState: 'REQUIRES_REVIEW',
        reason: 'Attendance recorded without roster assignment',
      },
    };
    repository.findUnrosteredExceptionAuditById.mockResolvedValue([createdAudit]);

    const result = await service.approveUnrosteredOverride(tenantId, 'exception-1', actorUserId, {
      reason: 'Approved as non-payroll attendance',
    });

    expect(result).toMatchObject({
      reviewStatus: 'APPROVED_OVERRIDE',
      payrollReadyRecord: null,
    });
    expect(repository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId,
        actorUserId,
        actionType: 'UNROSTERED_EXCEPTION_OVERRIDE_APPROVED',
        oldValues: expect.objectContaining({ reviewStatus: 'REQUIRES_REVIEW' }),
        newValues: expect.objectContaining({ reviewStatus: 'APPROVED_OVERRIDE' }),
      }),
    );
  });

  it('excludes unrostered attendance from payroll-ready records', async () => {
    rosterService.getActiveAssignmentForUserDate.mockResolvedValue(null);
    repository.findAttendanceLogsForUserDate.mockResolvedValue(logs);

    const result = await service.reconcileUserDate(tenantId, employeeId, date, { actorUserId });
    const payrollRecords = await service.getPayrollReadyRecords(
      tenantId,
      new Date(`${date}T00:00:00.000Z`),
      new Date(`${date}T00:00:00.000Z`),
    );

    expect(result.payrollReadyRecord).toBeNull();
    expect(payrollRecords).toEqual([]);
    expect(repository.findPayrollReadyRecords).toHaveBeenCalledWith(
      tenantId,
      new Date(`${date}T00:00:00.000Z`),
      new Date(`${date}T00:00:00.000Z`),
    );
  });

  it('queries unrostered exception records by tenant to preserve tenant isolation', async () => {
    await service.listUnrosteredExceptions(tenantId);
    await service.listUnrosteredExceptions(otherTenantId);

    expect(repository.findUnrosteredExceptionAudits).toHaveBeenNthCalledWith(1, tenantId);
    expect(repository.findUnrosteredExceptionAudits).toHaveBeenNthCalledWith(2, otherTenantId);
  });
});
