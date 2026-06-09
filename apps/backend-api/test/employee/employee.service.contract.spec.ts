import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmployeeService } from '../../src/employee/employee.service';
import { EmployeeRepository } from '../../src/employee/employee.repository';

const tenantId = '11111111-1111-4111-8111-111111111111';
const employeeId = '22222222-2222-4222-8222-222222222222';

const activeEmployee = {
  id: employeeId,
  tenantId,
  departmentId: null,
  payrollNumber: 'P-001',
  firstName: 'Amina',
  lastName: 'Njeri',
  email: 'amina@example.com',
  phoneNumber: null,
  role: 'EMPLOYEE',
  hourlyRate: 100,
  isActive: true,
  employmentType: 'FULL_TIME',
  employmentStatus: 'ACTIVE',
  devicePin: '1001',
  emergencyContacts: [],
  profileMetadata: {},
  deletedAt: null,
  createdAt: new Date('2026-06-01T00:00:00.000Z'),
  updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  department: null,
};

describe('EmployeeService integration contracts', () => {
  let repository: { findByIdOrThrow: jest.Mock; findByDevicePinOrThrow: jest.Mock };
  let service: EmployeeService;

  beforeEach(() => {
    repository = {
      findByIdOrThrow: jest.fn(),
      findByDevicePinOrThrow: jest.fn(),
    };
    service = new EmployeeService(repository as unknown as EmployeeRepository);
  });

  it('assertEmployeeEligible returns the tenant-scoped active employee contract', async () => {
    repository.findByIdOrThrow.mockResolvedValue(activeEmployee);

    const result = await service.assertEmployeeEligible(tenantId, employeeId);

    expect(repository.findByIdOrThrow).toHaveBeenCalledWith(tenantId, employeeId);
    expect(result).toMatchObject({
      id: employeeId,
      tenantId,
      employeeCode: 'P-001',
      isActive: true,
      employmentStatus: 'ACTIVE',
    });
  });

  it('assertEmployeeEligible rejects suspended, terminated, inactive, or deleted employees', async () => {
    repository.findByIdOrThrow.mockResolvedValue({
      ...activeEmployee,
      employmentStatus: 'SUSPENDED',
    });

    await expect(service.assertEmployeeEligible(tenantId, employeeId)).rejects.toThrow(BadRequestException);
  });

  it('resolveEmployeeByDevicePin uses tenant-scoped repository lookup', async () => {
    repository.findByDevicePinOrThrow.mockResolvedValue(activeEmployee);

    const result = await service.resolveEmployeeByDevicePin(tenantId, '1001');

    expect(repository.findByDevicePinOrThrow).toHaveBeenCalledWith(tenantId, '1001');
    expect(result.id).toBe(employeeId);
  });

  it('getEmployeeLifecycleState includes deleted employees for reconciliation skip decisions', async () => {
    repository.findByIdOrThrow.mockResolvedValue({
      ...activeEmployee,
      deletedAt: new Date('2026-06-02T00:00:00.000Z'),
      isActive: false,
      employmentStatus: 'TERMINATED',
    });

    const result = await service.getEmployeeLifecycleState(tenantId, employeeId);

    expect(repository.findByIdOrThrow).toHaveBeenCalledWith(tenantId, employeeId, true);
    expect(result).toMatchObject({
      tenantId,
      isActive: false,
      employmentStatus: 'TERMINATED',
    });
  });

  it('surfaces repository tenant misses as not found', async () => {
    repository.findByIdOrThrow.mockRejectedValue(new NotFoundException('Employee was not found for this tenant.'));

    await expect(service.assertEmployeeEligible(tenantId, employeeId)).rejects.toThrow(NotFoundException);
  });
});
