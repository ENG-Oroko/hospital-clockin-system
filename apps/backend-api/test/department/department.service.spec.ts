// Location: test/department/department.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/database/prisma.service';
import { DepartmentService } from '../../src/department/department.service';
import { TenantStorage } from '../../src/database/tenant.storage';

import { randomUUID } from 'crypto';


// Uses real database instead of mocks to validate actual behavior
describe('🏥 Department Service Integration Tests', () => {
  
  // Instance of PrismaService - handles all database operations
  // Will be initialized in beforeAll hook
  let prismaService: PrismaService;
  
  // Instance of DepartmentService - contains business logic being tested
  // Will be initialized in beforeAll hook
  let departmentService: DepartmentService;
  
  // UUID representing the primary test tenant (hospital organization)
  // randomUUID() generates a valid v4 UUID like: '123e4567-e89b-12d3-a456-426614174000'
  // This ensures PostgreSQL UUID column validation passes
  const tenantId = randomUUID();

  // ============================================
  // SETUP HOOKS - RUN ONCE BEFORE ALL TESTS
  // ============================================
  
  // beforeAll: Executes once before any tests in this suite run
  // Purpose: Initialize the testing environment and dependencies
  beforeAll(async () => {
    
    // Create a NestJS testing module - isolated dependency injection container
    // Similar to your actual application module but scoped to this test suite
    const module: TestingModule = await Test.createTestingModule({
      
      // Register providers (services) needed for these tests
      // Only includes what's necessary - minimal footprint
      providers: [
        PrismaService,      // Database connection service
        DepartmentService,  // Service under test
      ],
    }).compile(); // Compile the module and resolve all dependencies

    // Extract PrismaService instance from the compiled module
    // This gives us access to both .client (tenant-filtered) and .rawClient (unfiltered)
    prismaService = module.get<PrismaService>(PrismaService);
    
    // Extract DepartmentService instance from the compiled module
    // This is the actual service we're testing
    departmentService = module.get<DepartmentService>(DepartmentService);
    
    // Initialize Prisma connection to the database
    // Establishes connection pool and prepares database client
    await prismaService.onModuleInit();
  });

  // ============================================
  // SETUP HOOKS - RUN BEFORE EACH TEST
  // ============================================
  
  // beforeEach: Executes before every individual test (it block)
  // Purpose: Reset database to a clean, known state to ensure test isolation
  beforeEach(async () => {
    
    // STEP 1: Clean all department records from database
    // deleteMany({}) with empty filter = delete all rows
    // Uses rawClient to bypass tenant filtering middleware
    await prismaService.rawClient.department.deleteMany({});
    
    // STEP 2: Clean all tenant records from database
    // Order matters: delete child records (departments) before parent (tenants)
    // to avoid foreign key constraint violations
    await prismaService.rawClient.tenant.deleteMany({});

    // STEP 3: Seed a fresh test tenant for this specific test
    // Each test starts with exactly one tenant in the database
    await prismaService.rawClient.tenant.create({
      data: {
        // Provide the valid UUID generated at the top of the test suite
        id: tenantId,
        
        // Human-readable name for the tenant organization
        name: 'Test Hospital',
        
        // Subdomain used for tenant identification in multi-tenant routing
        // Example: test.chronos.hospital would resolve to this tenant
        subdomain: 'test',
        
        // URL-friendly identifier for the tenant
        slug: 'test-hospital',
        
        // License key for billing/feature gating
        licenseKey: 'TEST-LIC-001',
        
        // Flag indicating whether this tenant's account is active
        // Inactive tenants cannot access the system
        isActive: true,
      },
    });
  });

  // ============================================
  // TEARDOWN HOOKS - RUN ONCE AFTER ALL TESTS
  // ============================================
  
  // afterAll: Executes once after all tests in this suite complete
  // Purpose: Clean up resources and close database connections
  afterAll(async () => {
    
    // Gracefully disconnect from PostgreSQL database
    // Closes connection pool and releases system resources
    // Prevents "too many clients" errors and resource leaks
    await prismaService.onModuleDestroy();
  });

  // ============================================
  // TEST GROUP 1: DEPARTMENT CREATION
  // ============================================
  
  // Nested describe block - groups related tests together
  // Makes test output more readable and organized
  describe('Department Creation', () => {
    
    // ========================================
    // TEST CASE 1: Basic Create & Persist
    // ========================================
    
    // Individual test case - validates one specific behavior
    // 'it' is an alias for 'test' - both work identically
    it('should create department and persist to database', async () => {
      
      // Wrap test logic in a Promise to properly handle async tenant context
      // TenantStorage.run() uses AsyncLocalStorage which requires callback pattern
      await new Promise<void>((resolve, reject) => {
        
        // Set the tenant context for this async operation
        // All database queries inside this callback will automatically filter by tenantId
        TenantStorage.run(tenantId, async () => {
          
          // try-catch ensures errors are properly caught and passed to Jest
          // Without this, async errors might be swallowed
          try {
            
            // STEP 1: Call the service method to create a department
            // This is the actual business logic being tested
            const dept = await departmentService.create(
              {
                // Department name (required)
                name: 'ICU',
                
                // Department code (must be unique per tenant)
                code: 'ICU',
                
                // Optional department-specific rules
                // Overrides global system settings for this department
                rules: { gracePeriodMinutes: 10 },
              },
              // Pass tenant ID for authorization check
              tenantId,
            );

            // STEP 2: Verify the department was actually saved to PostgreSQL
            // Query directly using rawClient to bypass middleware
            // This ensures we're testing real database persistence, not just mocks
            const found = await prismaService.rawClient.department.findUnique({
              where: { id: dept.id }, // Search by the ID returned from create()
            });

            // STEP 3: Assert that the department exists in the database
            // expect().toBeDefined() fails if found is null or undefined
            expect(found).toBeDefined();
            
            // STEP 4: Verify the name was saved correctly
            // Tests data integrity
            expect(found?.name).toBe('ICU');
            
            // STEP 5: Verify the tenantId was automatically stamped
            // Critical for multi-tenant data isolation
            expect(found?.tenantId).toBe(tenantId);
            
            // Signal successful test completion
            resolve();
            
          } catch (err) {
            // If any assertion fails or error occurs, reject the promise
            // This ensures Jest properly marks the test as failed
            reject(err);
          }
        });
      });
    });

    // ========================================
    // TEST CASE 2: Duplicate Code Constraint
    // ========================================
    
    // Tests database-level constraint enforcement
    // Validates that business logic correctly handles constraint violations
    it('should enforce unique code constraint at database level', async () => {
      
      // Same Promise wrapper pattern for async tenant context
      await new Promise<void>((resolve, reject) => {
        
        // Set tenant context for this test
        TenantStorage.run(tenantId, async () => {
          
          try {
            
            // STEP 1: Create the first department successfully
            // This establishes the baseline - 'ICU' code now exists
            await departmentService.create(
              { name: 'ICU', code: 'ICU' },
              tenantId,
            );

            // STEP 2: Attempt to create a second department with the same code
            // This SHOULD fail because 'ICU' code already exists for this tenant
            // expect(...).rejects.toThrow() asserts that the promise is rejected
            await expect(
              departmentService.create(
                { 
                  name: 'ICU Main',  // Different name
                  code: 'ICU'        // Same code - should trigger error
                },
                tenantId,
              ),
            ).rejects.toThrow('Department code already exists');
            
            // If we reach here without error, the constraint is working correctly
            resolve();
            
          } catch (err) {
            // Unexpected error occurred
            reject(err);
          }
        });
      });
    });
  });

  // ============================================
  // TEST GROUP 2: TENANT ISOLATION
  // ============================================
  
  // Tests the most critical security feature: multi-tenant data isolation
  // Ensures Tenant A cannot see or modify Tenant B's data
  describe('Tenant Isolation', () => {
    
    // ========================================
    // TEST CASE 3: Cross-Tenant Code Uniqueness
    // ========================================
    
    // Validates that the same department code CAN exist across different tenants
    // Example: Both hospitals can have their own 'ICU' department
    it('should isolate departments across tenants', async () => {
      
      // Generate a second unique tenant ID
      // This represents a completely separate hospital organization
      const tenant2Id = randomUUID();

      // STEP 1: Create the second tenant in the database
      // Now we have two tenants: tenantId and tenant2Id
      await prismaService.rawClient.tenant.create({
        data: {
          id: tenant2Id,                    // Different UUID
          name: 'Another Hospital',          // Different name
          subdomain: 'another',              // Different subdomain
          slug: 'another-hospital',          // Different slug
          licenseKey: 'TEST-LIC-002',        // Different license
          isActive: true,
        },
      });

      // STEP 2: Create ICU department for Tenant 1
      // Execute within Tenant 1's context
      await new Promise<void>((resolve) => {
        TenantStorage.run(tenantId, async () => {
          
          // Create department with code 'ICU' for first tenant
          await departmentService.create(
            { name: 'ICU', code: 'ICU' },
            tenantId,
          );
          
          resolve();
        });
      });

      // STEP 3: Create ICU department for Tenant 2 (same code, different tenant)
      // This should succeed because tenant isolation allows duplicate codes
      // across different tenants
      await new Promise<void>((resolve) => {
        TenantStorage.run(tenant2Id, async () => {
          
          // Create department with the SAME code 'ICU' but for second tenant
          const dept = await departmentService.create(
            { name: 'ICU', code: 'ICU' },
            tenant2Id,
          );
          
          // Verify the department was created with the correct tenant ID
          // This proves tenant isolation is working
          expect(dept.tenantId).toBe(tenant2Id);
          
          resolve();
        });
      });

      // STEP 4: Verify both departments exist in the raw database
      // Query without tenant filtering to see global state
      const allDepts = await prismaService.rawClient.department.findMany({});
      
      // Assert exactly 2 departments exist (one per tenant)
      expect(allDepts).toHaveLength(2);
      
      // Assert the two departments belong to different tenants
      // This is the critical security validation
      expect(allDepts[0].tenantId).not.toBe(allDepts[1].tenantId);
    });
  });
});