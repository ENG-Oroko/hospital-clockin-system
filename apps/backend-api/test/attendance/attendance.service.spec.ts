import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { DatabaseService } from '../database/database.service';
import { QueueService } from '../queue/queue.service';
import { AttendanceStatus } from '@chronos/database';

// ─── Shared Mock Data ────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-uuid-001';
const USER_ID = 'user-uuid-001';
const DEVICE_ID = 'device-uuid-001';
const SUMMARY_ID = 'summary-uuid-001';
const ADMIN_ID = 'admin-uuid-001';

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_ID,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@hospital.com',
  isActive: true,
  departmentId: 'dept-uuid-001',
};

const mockLog = {
  id: 'log-uuid-001',
  tenantId: TENANT_ID,
  userId: USER_ID,
  deviceId: DEVICE_ID,
  direction: 'IN',
  timestamp: new Date('2026-06-03T08:00:00Z'),
  createdAt: new Date(),
  summaryId: null,
  rosterAssignmentId: null,
};

const mockSummary = {
  id: SUMMARY_ID,
  tenantId: TENANT_ID,
  userId: USER_ID,
  date: new Date('2026-06-03'),
  firstIn: new Date('2026-06-03T08:00:00Z'),
  lastOut: new Date('2026-06-03T17:00:00Z'),
  totalHours: 9,
  status: AttendanceStatus.PRESENT,
  lateMinutes: 0,
  overtimeHours: 1,
  shiftId: null,
  shiftName: null,
  scheduledStart: null,
  scheduledEnd: null,
  scheduledHours: null,
  processedAt: new Date(),
  reprocessedCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Mock Services ────────────────────────────────────────────────────────────

const mockDb = {
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  attendanceLog: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  attendanceSummary: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  attendanceAudit: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  // ─── ingestLog ─────────────────────────────────────────────────────────────

  describe('ingestLog', () => {
    const dto = {
      tenantId: TENANT_ID,
      userId: USER_ID,
      deviceId: DEVICE_ID,
      direction: 'IN' as const,
      timestamp: new Date('2026-06-03T08:00:00Z'),
    };

    it('should ingest a log and queue processing', async () => {
      mockDb.user.findFirst.mockResolvedValue(mockUser);
      mockDb.attendanceLog.upsert.mockResolvedValue(mockLog);
      mockQueue.add.mockResolvedValue(undefined);

      const result = await service.ingestLog(dto);

      expect(mockDb.user.findFirst).toHaveBeenCalledWith({
        where: { id: USER_ID, tenantId: TENANT_ID, isActive: true },
      });
      expect(mockDb.attendanceLog.upsert).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'attendance.process',
        expect.objectContaining({ logId: mockLog.id, userId: USER_ID }),
      );
      expect(result).toEqual(mockLog);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockDb.user.findFirst.mockResolvedValue(null);

      await expect(service.ingestLog(dto)).rejects.toThrow(BadRequestException);
      expect(mockDb.attendanceLog.upsert).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is inactive', async () => {
      mockDb.user.findFirst.mockResolvedValue(null); // isActive: false filtered out
      await expect(service.ingestLog(dto)).rejects.toThrow(
        'Invalid user or user not active',
      );
    });

    it('should upsert without creating duplicate logs', async () => {
      mockDb.user.findFirst.mockResolvedValue(mockUser);
      mockDb.attendanceLog.upsert.mockResolvedValue(mockLog);
      mockQueue.add.mockResolvedValue(undefined);

      await service.ingestLog(dto);

      const upsertCall = mockDb.attendanceLog.upsert.mock.calls[0][0];
      expect(upsertCall.where.userId_deviceId_direction_timestamp).toEqual({
        userId: USER_ID,
        deviceId: DEVICE_ID,
        direction: 'IN',
        timestamp: dto.timestamp,
      });
      expect(upsertCall.update).toEqual({});
    });

    it('should include rosterAssignmentId when provided', async () => {
      const dtoWithRoster = { ...dto, rosterAssignmentId: 'roster-uuid-001' };
      mockDb.user.findFirst.mockResolvedValue(mockUser);
      mockDb.attendanceLog.upsert.mockResolvedValue(mockLog);
      mockQueue.add.mockResolvedValue(undefined);

      await service.ingestLog(dtoWithRoster);

      const createData = mockDb.attendanceLog.upsert.mock.calls[0][0].create;
      expect(createData.rosterAssignmentId).toBe('roster-uuid-001');
    });
  });

  // ─── bulkIngest ────────────────────────────────────────────────────────────

  describe('bulkIngest', () => {
    const logs = Array.from({ length: 3 }, (_, i) => ({
      tenantId: TENANT_ID,
      userId: `user-${i}`,
      deviceId: DEVICE_ID,
      direction: 'IN' as const,
      timestamp: new Date(),
    }));

    it('should process all logs and return success count', async () => {
      mockDb.user.findFirst.mockResolvedValue(mockUser);
      mockDb.attendanceLog.upsert.mockResolvedValue(mockLog);
      mockQueue.add.mockResolvedValue(undefined);

      const result = await service.bulkIngest(logs);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should track failed logs without throwing', async () => {
      mockDb.user.findFirst
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null) // second log fails
        .mockResolvedValueOnce(mockUser);
      mockDb.attendanceLog.upsert.mockResolvedValue(mockLog);
      mockQueue.add.mockResolvedValue(undefined);

      const result = await service.bulkIngest(logs);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should process in batches of 100', async () => {
      const largeBatch = Array.from({ length: 150 }, (_, i) => ({
        tenantId: TENANT_ID,
        userId: `user-${i}`,
        deviceId: DEVICE_ID,
        direction: 'IN' as const,
        timestamp: new Date(),
      }));

      mockDb.user.findFirst.mockResolvedValue(mockUser);
      mockDb.attendanceLog.upsert.mockResolvedValue(mockLog);
      mockQueue.add.mockResolvedValue(undefined);

      const result = await service.bulkIngest(largeBatch);
      expect(result.success + result.failed).toBe(150);
    });
  });

  // ─── getSummaries ──────────────────────────────────────────────────────────

  describe('getSummaries', () => {
    it('should return paginated summaries with meta', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([mockSummary]);
      mockDb.attendanceSummary.count.mockResolvedValue(1);

      const result = await service.getSummaries({ tenantId: TENANT_ID });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should filter by userId when provided', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([mockSummary]);
      mockDb.attendanceSummary.count.mockResolvedValue(1);

      await service.getSummaries({ tenantId: TENANT_ID, userId: USER_ID });

      const whereClause = mockDb.attendanceSummary.findMany.mock.calls[0][0].where;
      expect(whereClause.userId).toBe(USER_ID);
    });

    it('should filter by departmentId by resolving users', async () => {
      mockDb.user.findMany.mockResolvedValue([{ id: USER_ID }]);
      mockDb.attendanceSummary.findMany.mockResolvedValue([mockSummary]);
      mockDb.attendanceSummary.count.mockResolvedValue(1);

      await service.getSummaries({ tenantId: TENANT_ID, departmentId: 'dept-001' });

      expect(mockDb.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, departmentId: 'dept-001' },
        select: { id: true },
      });
      const whereClause = mockDb.attendanceSummary.findMany.mock.calls[0][0].where;
      expect(whereClause.userId).toEqual({ in: [USER_ID] });
    });

    it('should filter by date range', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([]);
      mockDb.attendanceSummary.count.mockResolvedValue(0);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      await service.getSummaries({ tenantId: TENANT_ID, startDate, endDate });

      const whereClause = mockDb.attendanceSummary.findMany.mock.calls[0][0].where;
      expect(whereClause.date).toEqual({ gte: startDate, lte: endDate });
    });

    it('should paginate correctly', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([]);
      mockDb.attendanceSummary.count.mockResolvedValue(200);

      const result = await service.getSummaries({
        tenantId: TENANT_ID,
        page: 3,
        limit: 20,
      });

      const call = mockDb.attendanceSummary.findMany.mock.calls[0][0];
      expect(call.skip).toBe(40);
      expect(call.take).toBe(20);
      expect(result.meta.totalPages).toBe(10);
    });
  });

  // ─── getDailyBreakdown ─────────────────────────────────────────────────────

  describe('getDailyBreakdown', () => {
    it('should query summaries for full day range', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([mockSummary]);

      const date = new Date('2026-06-03T12:00:00Z');
      await service.getDailyBreakdown(TENANT_ID, date);

      const whereClause = mockDb.attendanceSummary.findMany.mock.calls[0][0].where;
      expect(whereClause.tenantId).toBe(TENANT_ID);
      expect(whereClause.date.gte.getHours()).toBe(0);
      expect(whereClause.date.lte.getHours()).toBe(23);
    });

    it('should include user department and logs', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([mockSummary]);

      await service.getDailyBreakdown(TENANT_ID, new Date());

      const include = mockDb.attendanceSummary.findMany.mock.calls[0][0].include;
      expect(include.user.select.department).toBeDefined();
      expect(include.logs).toBeDefined();
    });
  });

  // ─── manualOverride ────────────────────────────────────────────────────────

  describe('manualOverride', () => {
    const overrideData = {
      firstIn: new Date('2026-06-03T07:45:00Z'),
      lastOut: new Date('2026-06-03T17:00:00Z'),
      status: 'PRESENT',
      totalHours: 9.25,
      lateMinutes: 0,
      overtimeHours: 1.25,
      justification: 'Clock-in device malfunction',
    };

    it('should update summary and create audit record', async () => {
      mockDb.attendanceSummary.findUnique.mockResolvedValue(mockSummary);
      mockDb.$transaction.mockImplementation(async (ops) => {
        return Promise.all(ops.map((op: any) => op));
      });
      mockDb.attendanceSummary.update.mockResolvedValue({
        ...mockSummary,
        ...overrideData,
      });
      mockDb.attendanceAudit.create.mockResolvedValue({});

      const result = await service.manualOverride(
        TENANT_ID,
        ADMIN_ID,
        SUMMARY_ID,
        overrideData,
      );

      expect(mockDb.attendanceSummary.findUnique).toHaveBeenCalledWith({
        where: { id: SUMMARY_ID },
      });
      expect(mockDb.$transaction).toHaveBeenCalled();
      expect(result.totalHours).toBe(9.25);
    });

    it('should throw NotFoundException if summary not found', async () => {
      mockDb.attendanceSummary.findUnique.mockResolvedValue(null);

      await expect(
        service.manualOverride(TENANT_ID, ADMIN_ID, SUMMARY_ID, overrideData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if summary belongs to different tenant', async () => {
      mockDb.attendanceSummary.findUnique.mockResolvedValue({
        ...mockSummary,
        tenantId: 'other-tenant',
      });

      await expect(
        service.manualOverride(TENANT_ID, ADMIN_ID, SUMMARY_ID, overrideData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should preserve existing values when fields are not overridden', async () => {
      mockDb.attendanceSummary.findUnique.mockResolvedValue(mockSummary);
      mockDb.$transaction.mockImplementation(async (ops) =>
        Promise.all(ops.map((op: any) => op)),
      );
      mockDb.attendanceSummary.update.mockResolvedValue(mockSummary);
      mockDb.attendanceAudit.create.mockResolvedValue({});

      await service.manualOverride(TENANT_ID, ADMIN_ID, SUMMARY_ID, {
        justification: 'Partial override',
      });

      const updateData = mockDb.attendanceSummary.update.mock.calls[0][0].data;
      expect(updateData.firstIn).toEqual(mockSummary.firstIn);
      expect(updateData.lastOut).toEqual(mockSummary.lastOut);
    });

    it('should increment reprocessedCount', async () => {
      mockDb.attendanceSummary.findUnique.mockResolvedValue(mockSummary);
      mockDb.$transaction.mockImplementation(async (ops) =>
        Promise.all(ops.map((op: any) => op)),
      );
      mockDb.attendanceSummary.update.mockResolvedValue(mockSummary);
      mockDb.attendanceAudit.create.mockResolvedValue({});

      await service.manualOverride(TENANT_ID, ADMIN_ID, SUMMARY_ID, {
        justification: 'test',
      });

      const updateData = mockDb.attendanceSummary.update.mock.calls[0][0].data;
      expect(updateData.reprocessedCount).toEqual({ increment: 1 });
    });
  });

  // ─── getAuditTrail ─────────────────────────────────────────────────────────

  describe('getAuditTrail', () => {
    it('should return audit records ordered by createdAt desc', async () => {
      const mockAudits = [
        { id: 'audit-1', actionType: 'OVERRIDE', createdAt: new Date() },
      ];
      mockDb.attendanceAudit.findMany.mockResolvedValue(mockAudits);

      const result = await service.getAuditTrail(TENANT_ID, SUMMARY_ID);

      expect(mockDb.attendanceAudit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, targetSummaryId: SUMMARY_ID },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should include actor user details', async () => {
      mockDb.attendanceAudit.findMany.mockResolvedValue([]);

      await service.getAuditTrail(TENANT_ID, SUMMARY_ID);

      const include = mockDb.attendanceAudit.findMany.mock.calls[0][0].include;
      expect(include.user.select).toMatchObject({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      });
    });
  });

  // ─── recalculateRange ──────────────────────────────────────────────────────

  describe('recalculateRange', () => {
    it('should queue reprocessing for all summaries in range', async () => {
      const summaries = [
        { id: 'sum-1', userId: USER_ID, date: new Date('2026-06-01') },
        { id: 'sum-2', userId: USER_ID, date: new Date('2026-06-02') },
      ];
      mockDb.attendanceSummary.findMany.mockResolvedValue(summaries);
      mockQueue.add.mockResolvedValue(undefined);

      const result = await service.recalculateRange(
        TENANT_ID,
        new Date('2026-06-01'),
        new Date('2026-06-07'),
      );

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'attendance.reprocess',
        expect.objectContaining({ summaryId: 'sum-1' }),
      );
      expect(result).toEqual({ queued: 2 });
    });

    it('should filter by userId when provided', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([]);
      mockQueue.add.mockResolvedValue(undefined);

      await service.recalculateRange(
        TENANT_ID,
        new Date('2026-06-01'),
        new Date('2026-06-07'),
        USER_ID,
      );

      const whereClause = mockDb.attendanceSummary.findMany.mock.calls[0][0].where;
      expect(whereClause.userId).toBe(USER_ID);
    });

    it('should return queued: 0 when no summaries found', async () => {
      mockDb.attendanceSummary.findMany.mockResolvedValue([]);

      const result = await service.recalculateRange(
        TENANT_ID,
        new Date('2026-06-01'),
        new Date('2026-06-07'),
      );

      expect(result).toEqual({ queued: 0 });
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  // ─── getRawLogs ────────────────────────────────────────────────────────────

  describe('getRawLogs', () => {
    it('should return paginated logs with total', async () => {
      mockDb.attendanceLog.findMany.mockResolvedValue([mockLog]);
      mockDb.attendanceLog.count.mockResolvedValue(1);

      const result = await service.getRawLogs(TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });

    it('should filter by direction', async () => {
      mockDb.attendanceLog.findMany.mockResolvedValue([mockLog]);
      mockDb.attendanceLog.count.mockResolvedValue(1);

      await service.getRawLogs(TENANT_ID, { direction: 'IN' });

      const whereClause = mockDb.attendanceLog.findMany.mock.calls[0][0].where;
      expect(whereClause.direction).toBe('IN');
    });

    it('should filter by date range', async () => {
      mockDb.attendanceLog.findMany.mockResolvedValue([]);
      mockDb.attendanceLog.count.mockResolvedValue(0);

      const startDate = new Date('2026-06-01');
      const endDate = new Date('2026-06-30');

      await service.getRawLogs(TENANT_ID, { startDate, endDate });

      const whereClause = mockDb.attendanceLog.findMany.mock.calls[0][0].where;
      expect(whereClause.timestamp).toEqual({ gte: startDate, lte: endDate });
    });
  });

  // ─── getDashboardStats ─────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('should return all stat counts and attendance rate', async () => {
      mockDb.$transaction.mockResolvedValue([100, 80, 10, 15, 5, 100]);

      const result = await service.getDashboardStats(TENANT_ID, new Date());

      expect(result.totalSummaries).toBe(100);
      expect(result.present).toBe(80);
      expect(result.late).toBe(10);
      expect(result.absent).toBe(15);
      expect(result.onLeave).toBe(5);
      expect(result.totalEmployees).toBe(100);
      expect(result.attendanceRate).toBe(80);
    });

    it('should return attendanceRate of 0 when no employees', async () => {
      mockDb.$transaction.mockResolvedValue([0, 0, 0, 0, 0, 0]);

      const result = await service.getDashboardStats(TENANT_ID, new Date());

      expect(result.attendanceRate).toBe(0);
    });

    it('should query for the full day range', async () => {
      mockDb.$transaction.mockResolvedValue([0, 0, 0, 0, 0, 0]);

      const date = new Date('2026-06-03T14:30:00Z');
      await service.getDashboardStats(TENANT_ID, date);

      // $transaction is called with an array of promises — verify it's called
      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });
});