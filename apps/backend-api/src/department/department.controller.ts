import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@chronos/types-common';

import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AssignDepartmentMemberDto } from './dto/assign-department-member.dto';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { TenantId } from '../common/tenant/tenant-id.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  // CREATE
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  createDepartment(@Body() dto: CreateDepartmentDto, @TenantId() tenantId: string) {
    return this.departmentService.create(dto, tenantId);
  }

  // LIST
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  listDepartments(@TenantId() tenantId: string) {
    return this.departmentService.listDepartments(tenantId);
  }

  // UPDATE
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  updateDepartment(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateDepartmentDto,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.updateDepartment(
      departmentId,
      dto,
      tenantId,
    );
  }

  // DELETE
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  deleteDepartment(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.deleteDepartment(
      departmentId,
      tenantId,
    );
  }

  // ASSIGN HEAD (HOD)
  @Post(':id/head')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  assignHead(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() body: AssignDepartmentMemberDto,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.assignDepartmentHead(
      tenantId,
      departmentId,
      body.userId,
    );
  }

  // ASSIGN STAFF
  @Post(':id/staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  assignStaff(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() body: AssignDepartmentMemberDto,
    @TenantId() tenantId: string,
  ) {
    return this.departmentService.assignDepartmentStaff(
      tenantId,
      departmentId,
      body.userId,
    );
  }

  // LIST STAFF
  @Get(':id/staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  listStaff(@Param('id', ParseUUIDPipe) departmentId: string, @TenantId() tenantId: string) {
    return this.departmentService.listDepartmentStaff(tenantId, departmentId);
  }
}
