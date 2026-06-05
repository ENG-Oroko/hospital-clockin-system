import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  UserRole,
} from '@chronos/types-common';
import type {
  EmployeeCreateDTO,
  EmployeeDepartmentUpdateDTO,
  EmployeeDeviceUserUpdateDTO,
  EmployeeQueryDTO,
  EmployeeStatusUpdateDTO,
  EmployeeUpdateDTO,
} from '@chronos/types-common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import { EmployeeService } from './employee.service';

@Controller('api/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  create(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Body() payload: EmployeeCreateDTO) {
    return this.employeeService.create(tenantId, user, payload);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  list(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: EmployeeQueryDTO) {
    return this.employeeService.list(tenantId, user, query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR, UserRole.EMPLOYEE)
  getById(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeeService.getById(tenantId, user, id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  update(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: EmployeeUpdateDTO) {
    return this.employeeService.update(tenantId, user, id, payload);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  softDelete(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeeService.softDelete(tenantId, user, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  updateStatus(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: EmployeeStatusUpdateDTO) {
    return this.employeeService.updateStatus(tenantId, user, id, payload);
  }

  @Patch(':id/department')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  updateDepartment(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: EmployeeDepartmentUpdateDTO) {
    return this.employeeService.updateDepartment(tenantId, user, id, payload);
  }

  @Patch(':id/device-user')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  updateDeviceUser(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: EmployeeDeviceUserUpdateDTO) {
    return this.employeeService.updateDeviceUser(tenantId, user, id, payload);
  }

  @Patch(':id/restore')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  restore(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeeService.restore(tenantId, user, id);
  }
}
