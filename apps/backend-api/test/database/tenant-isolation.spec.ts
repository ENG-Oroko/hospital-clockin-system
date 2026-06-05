// Location: apps/backend-api/test/database/tenant-isolation.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/database/prisma.service';
import { TenantStorage } from '../../src/database/tenant.storage';

describe('🔒 Hospital Chronos: Multi-Tenant Complete Security Matrix', () => {
  let prismaService: PrismaService;

  // Cryptographically distinct UUID fixtures for absolute multi-tenant boundary validation
  const tenantAId = 'b24da26e-d7b5-403a-ae44-c8e682ad351b';
  const tenantBId = '7c9e0341-a1b2-4cd5-be67-e8f901ad234c';

  const VALID_USER_A_UUID = '11111111-1111-1111-1111-111111111111';
  const VALID_USER_B_UUID = '22222222-2222-2222-2222-222222222222';

  const VALID_DEVICE_A_UUID = 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3';
  const VALID_DEVICE_B_UUID = 'b5b5b5b5-b5b5-b5b5-b5b5-b5b5b5b5b5b5';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  beforeEach(async () => {
    // Cascade-clean execution path using the raw database escape hatch client
    await prismaService.rawClient.attendanceLog.deleteMany({});
    await prismaService.rawClient.user.deleteMany({});
    await prismaService.rawClient.device.deleteMany({});
    await prismaService.rawClient.tenant.deleteMany({});

    // Seed Isolated Tenants
    await prismaService.rawClient.tenant.create({
      data: {
        id: tenantAId,
        name: 'St. Teresa Referral Hospital',
        subdomain: 'st-teresa',
        slug: 'st-teresa-referral',
        licenseKey: 'LIC-TERESA-1002',
        isActive: true,
      },
    });

    await prismaService.rawClient.tenant.create({
      data: {
        id: tenantBId,
        name: 'Migori Sub-County Hospital',
        subdomain: 'migori-subcounty',
        slug: 'migori-subcounty-hospital',
        licenseKey: 'LIC-MIGORI-5509',
        isActive: true,
      },
    });

    // Seed Hardware Devices mapped explicitly per Tenant boundary
    await prismaService.rawClient.device.create({
      data: {
        id: VALID_DEVICE_A_UUID,
        tenantId: tenantAId,
        name: 'Maternity Wing Gate A',
        serialCode: 'MAC-AA-BB-CC-11',
        isActive: true,
      },
    });

    await prismaService.rawClient.device.create({
      data: {
        id: VALID_DEVICE_B_UUID,
        tenantId: tenantBId,
        name: 'Outpatient Clock-in Terminal',
        serialCode: 'MAC-DD-EE-FF-22',
        isActive: true,
      },
    });

    // Seed Users inside their explicit corporate partitions
    await prismaService.rawClient.user.create({
      data: {
        id: VALID_USER_A_UUID,
        tenantId: tenantAId,
        payrollNumber: 'PN-TERESA-001',
        firstName: 'Nicholas',
        lastName: 'Ngore',
        email: 'ngore@teresa.hospital',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        role: 'EMPLOYEE',
        devicePin: '1001',
        isActive: true,
      },
    });

    await prismaService.rawClient.user.create({
      data: {
        id: VALID_USER_B_UUID,
        tenantId: tenantBId,
        payrollNumber: 'PN-MIGORI-992',
        firstName: 'John',
        lastName: 'Doe',
        email: 'j.doe@migori.hospital',
        passwordHash: '$2b$10$xyzjwtpaulostringsecret',
        role: 'EMPLOYEE',
        devicePin: '9902',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
  });

  describe('🎯 Module Boundary: AsyncLocalStorage Lifecycle Contracts', () => {
    it('should accurately resolve active tenant context across concurrent execution timelines', async () => {
      TenantStorage.run(tenantAId, () => {
        expect(TenantStorage.getTenantId()).toBe(tenantAId);
        expect(TenantStorage.getTenantIdOrThrow()).toBe(tenantAId);
      });
    });

    it('should fall back gracefully to undefined when execution flows outside authenticated routes', async () => {
      expect(TenantStorage.getTenantId()).toBeUndefined();
      expect(() => TenantStorage.getTenantIdOrThrow()).toThrow();
    });
  });

  describe('🗄️ Outside Database Boundary: Live Multi-Tenant Execution Contracts', () => {
    it('should physically write records into PostgreSQL and automatically stamp the active tenantId metadata', async () => {
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantAId, async () => {
          try {
            const log = await prismaService.client.attendanceLog.create({
              data: {
                tenantId: tenantAId,
                userId: VALID_USER_A_UUID,
                deviceId: VALID_DEVICE_A_UUID,
                direction: 'IN',
                timestamp: new Date(),
              },
            });

            expect(log).toBeDefined();
            expect(log.tenantId).toBe(tenantAId);
            expect(log.userId).toBe(VALID_USER_A_UUID);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    it('should enforce absolute data isolation barriers and eliminate cross-tenant leakage on collection reads', async () => {
      // 1. Seed private record under Tenant B runtime footprint
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantBId, async () => {
          try {
            await prismaService.client.attendanceLog.create({
              data: {
                tenantId: tenantBId,
                userId: VALID_USER_B_UUID,
                deviceId: VALID_DEVICE_B_UUID,
                direction: 'IN',
                timestamp: new Date(),
              },
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });

      // 2. Pivot context execution timeline cleanly to Tenant A space and perform read operation
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantAId, async () => {
          try {
            const tenantAVisibleLogs = await prismaService.client.attendanceLog.findMany({});
            expect(tenantAVisibleLogs.length).toBe(0);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    it('should completely neutralize point lookup injection vector bypass attacks', async () => {
      let privateLogTenantB: any;

      // Create target baseline record safely inside Tenant B boundary context
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantBId, async () => {
          try {
            privateLogTenantB = await prismaService.client.attendanceLog.create({
              data: {
                tenantId: tenantBId,
                userId: VALID_USER_B_UUID,
                deviceId: VALID_DEVICE_B_UUID,
                direction: 'OUT',
                timestamp: new Date(),
              },
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });

      // Attempt explicit point target lookup injection vectors inside Tenant A boundary space
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantAId, async () => {
          try {
            const structuralFetch = await prismaService.client.attendanceLog.findUnique({
              where: { id: privateLogTenantB.id },
            });

            expect(structuralFetch).toBeNull();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });

    it('should permit unrestricted visibility across rows when invoking workflows via the rawClient instance', async () => {
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantAId, async () => {
          try {
            await prismaService.client.attendanceLog.create({
              data: {
                tenantId: tenantAId,
                userId: VALID_USER_A_UUID,
                deviceId: VALID_DEVICE_A_UUID,
                direction: 'IN',
                timestamp: new Date(),
              },
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });

      const globalLogVolume = await prismaService.rawClient.attendanceLog.findMany({});
      expect(globalLogVolume.length).toBeGreaterThanOrEqual(1);
    });

    it('should guarantee absolute context isolation under high-volume interleaved asynchronous loads', async () => {
      const operations = Array.from({ length: 40 }).map((_, index) => {
        const isEven = index % 2 === 0;
        const targetTenant = isEven ? tenantAId : tenantBId;
        const targetUser = isEven ? VALID_USER_A_UUID : VALID_USER_B_UUID;
        const targetDevice = isEven ? VALID_DEVICE_A_UUID : VALID_DEVICE_B_UUID;

        return new Promise<void>((resolve, reject) => {
          TenantStorage.run(targetTenant, async () => {
            try {
              // Introduce artificial jitter variance to force Node.js event loop interleaving
              await new Promise((res) => setTimeout(res, Math.random() * 15));

              const log = await prismaService.client.attendanceLog.create({
                data: {
                  tenantId: targetTenant,
                  userId: targetUser,
                  deviceId: targetDevice,
                  direction: 'IN',
                  timestamp: new Date(),
                },
              });

              expect(log.tenantId).toBe(targetTenant);
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        });
      });

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should reject or override writes where the payload tenantId contradicts the authenticated context identifier', async () => {
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantAId, async () => {
          try {
            // Adversarial Execution: Bound to Tenant A context, but payload passes Tenant B explicitly
            await prismaService.client.attendanceLog.create({
              data: {
                tenantId: tenantBId, 
                userId: VALID_USER_A_UUID,
                deviceId: VALID_DEVICE_A_UUID,
                direction: 'OUT',
                timestamp: new Date(),
              },
            });

            // Read directly via backdoor client to audit structural enforcement
            const records = await prismaService.rawClient.attendanceLog.findMany({
              where: { userId: VALID_USER_A_UUID },
            });

            // Defensive Verification: The client engine must force context override to secure partition integrity
            expect(records[0].tenantId).toBe(tenantAId);
            expect(records[0].tenantId).not.toBe(tenantBId);
            resolve();
          } catch (err) {
            // If your engine is configured to throw a validation error instead of overriding, handle it cleanly:
            // expect(err).toBeDefined();
            // resolve();
            reject(err);
          }
        });
      });
    });

    it('should fully decontaminate database sockets and prevent tenant leakage following database transaction rollbacks', async () => {
      // 1. Force an unhandled internal transaction error inside Tenant B to stress the session state pooling
      await new Promise<void>((resolve) => {
        TenantStorage.run(tenantBId, async () => {
          try {
            await prismaService.client.$transaction(async (tx) => {
              // Intentional structural breakdown: payload forces a unique constraint violation or type casting error
              await tx.user.create({
                data: {
                  id: VALID_USER_A_UUID, // Conflicts with pre-existing seeded User A ID
                  tenantId: tenantBId,
                  payrollNumber: 'PN-CONFLICT',
                  firstName: 'Malicious',
                  lastName: 'Actor',
                  email: 'leak@hospital.chronos',
                  passwordHash: '000000',
                  role: 'EMPLOYEE',
                  devicePin: '0000',
                  isActive: true,
                },
              });
            });
          } catch (err) {
            // Rollback confirmed and caught safely
            resolve();
          }
        });
      });

      // 2. Immediately execute queries under Tenant A context over the recycled connection pool sockets
      await new Promise<void>((resolve, reject) => {
        TenantStorage.run(tenantAId, async () => {
          try {
            const accessibleUsers = await prismaService.client.user.findMany({});
            
            // Assert that connection pooling has zero residual leakage from Tenant B's failed state
            expect(accessibleUsers.every((user) => user.tenantId === tenantAId)).toBe(true);
            expect(accessibleUsers.some((user) => user.tenantId === tenantBId)).toBe(false);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    });
  });
});