import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  UserRole,
} from '@chronos/types-common';
import type {
  ShiftAssignmentCreateDTO,
  ShiftAssignmentUnassignDTO,
  ShiftTemplateCreateDTO,
  ShiftTemplateQueryDTO,
  ShiftTemplateUpdateDTO,
} from '@chronos/types-common';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import { RosterService } from './roster.service';

@Controller('api/roster')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  @Post('shifts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  createShiftTemplate(@TenantId() tenantId: string, @Body() payload: ShiftTemplateCreateDTO) {
    return this.rosterService.createShiftTemplate(tenantId, payload);
  }

  @Get('shifts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  listShiftTemplates(@TenantId() tenantId: string, @Query() query: ShiftTemplateQueryDTO) {
    return this.rosterService.listShiftTemplates(tenantId, query);
  }

  @Get('shifts/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR, UserRole.EMPLOYEE)
  getShiftTemplate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.rosterService.getShiftTemplate(tenantId, id);
  }

  @Patch('shifts/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  updateShiftTemplate(@TenantId() tenantId: string, @Param('id') id: string, @Body() payload: ShiftTemplateUpdateDTO) {
    return this.rosterService.updateShiftTemplate(tenantId, id, payload);
  }

  @Delete('shifts/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  deactivateShiftTemplate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.rosterService.deactivateShiftTemplate(tenantId, id);
  }

  @Post('shifts/:id/assign-employees')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  assignEmployees(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: ShiftAssignmentCreateDTO) {
    return this.rosterService.assignEmployees(tenantId, user, id, payload);
  }

  @Post('shifts/:id/unassign-employees')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD)
  unassignEmployees(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() payload: ShiftAssignmentUnassignDTO) {
    return this.rosterService.unassignEmployees(tenantId, user, id, payload);
  }
}
