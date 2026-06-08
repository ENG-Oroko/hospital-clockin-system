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
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import { DepartmentService } from './department.service';
import { HierarchyRegistryService } from './service/hierarchy-registry.service';
import { CostCenterMapperService } from './service/cost-center-mapper.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AssignDepartmentMemberDto } from './dto/assign-department-member.dto';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly hierarchyRegistry: HierarchyRegistryService,
    private readonly costCenterMapper: CostCenterMapperService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  createDepartment(@Body() dto: CreateDepartmentDto, @TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.departmentService.create(dto, tenantId, user.userId);
  }

  @Get('hierarchy/tree')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getHierarchy(@TenantId() tenantId: string) {
    return this.hierarchyRegistry.getHierarchy(tenantId);
  }

  @Get('hierarchy/roots')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getRootDepartments(@TenantId() tenantId: string) {
    return this.hierarchyRegistry.getRootDepartments(tenantId);
  }

  @Get('cost-centers/all')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getAllCostCenters(@TenantId() tenantId: string) {
    return this.costCenterMapper.getAllCostCenters(tenantId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  listDepartments(@TenantId() tenantId: string) {
    return this.departmentService.findAll(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getDepartment(@Param('id', ParseUUIDPipe) departmentId: string, @TenantId() tenantId: string) {
    return this.departmentService.findOne(departmentId, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  updateDepartment(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateDepartmentDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentService.update(departmentId, dto, tenantId, user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  deleteDepartment(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentService.delete(departmentId, tenantId, user.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  updateStatus(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE',
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentService.updateStatus(departmentId, tenantId, status, user.userId);
  }

  @Get(':id/children')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getChildren(@Param('id', ParseUUIDPipe) departmentId: string, @TenantId() tenantId: string) {
    return this.hierarchyRegistry.getChildren(departmentId, tenantId);
  }

  @Get(':id/cost-center')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getCostCenter(@Param('id', ParseUUIDPipe) departmentId: string, @TenantId() tenantId: string) {
    return this.costCenterMapper.getCostCenterCode(departmentId, tenantId);
  }

  @Patch(':id/cost-center')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  updateCostCenter(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body('costCenterCode') costCenterCode: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentService.updateCostCenterCode(departmentId, tenantId, costCenterCode, user.userId);
  }

  @Post(':id/head')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  assignHead(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() body: AssignDepartmentMemberDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentService.assignDepartmentHead(tenantId, departmentId, body.userId, user);
  }

  @Post(':id/staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  assignStaff(
    @Param('id', ParseUUIDPipe) departmentId: string,
    @Body() body: AssignDepartmentMemberDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.departmentService.assignDepartmentStaff(tenantId, departmentId, body.userId, user);
  }

  @Get(':id/staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  listStaff(@Param('id', ParseUUIDPipe) departmentId: string, @TenantId() tenantId: string) {
    return this.departmentService.listDepartmentStaff(tenantId, departmentId);
  }
}
