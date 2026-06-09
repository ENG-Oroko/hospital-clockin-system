import { ReconciliationRepository } from '../../src/reconciliation/reconciliation.repository';
import { PrismaService } from '../../src/database/prisma.service';

describe('ReconciliationRepository payroll readiness', () => {
  it('filters payroll-ready records to resolved, unflagged, non-exception reconciliation logs within the tenant', async () => {
    const prisma = {
      reconciliationLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const repository = new ReconciliationRepository(prisma);
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const startDate = new Date('2026-06-01T00:00:00.000Z');
    const endDate = new Date('2026-06-30T00:00:00.000Z');

    await repository.findPayrollReadyRecords(tenantId, startDate, endDate);

    expect(prisma.reconciliationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          isResolved: true,
          isFlagged: false,
          exceptionReason: null,
          rosterAssignment: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      }),
    );
  });
});
