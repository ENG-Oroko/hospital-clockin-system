import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { ILeave } from './interfaces/leave.interface';
import { LeaveStatus } from './enums/leave-status.enum';

@Controller('leaves')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLeave(
    @Body() dto: CreateLeaveDto,
    @TenantId() tenantId: string,
  ): Promise<ILeave> {
    return this.leaveService.createLeave({
      ...dto,
      tenantId,
    });
  }

  @Get()
  async getAllLeaves(
    @TenantId() tenantId: string,
    @Query('status') status?: LeaveStatus,
  ): Promise<ILeave[]> {
    if (status) {
      return this.leaveService.getLeavesByStatus(tenantId, status);
    }
    return this.leaveService.getAllLeaves(tenantId);
  }

  @Get('employee/:employeeId')
  async getLeavesByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @TenantId() tenantId: string,
  ): Promise<ILeave[]> {
    return this.leaveService.getLeavesByEmployee(
      tenantId,
      employeeId,
    );
  }

  @Get(':id')
  async getLeaveById(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<ILeave> {
    return this.leaveService.getLeaveById(tenantId, id);
  }

  @Patch(':id/status')
  async updateLeaveStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveStatusDto,
    @TenantId() tenantId: string,
  ): Promise<ILeave> {
    return this.leaveService.updateLeaveStatus(tenantId, id, dto);
  }

  @Patch(':id/cancel')
  async cancelLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('employeeId', ParseUUIDPipe) employeeId: string,
    @TenantId() tenantId: string,
  ): Promise<ILeave> {
    return this.leaveService.cancelLeave(tenantId, id, employeeId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<void> {
    return this.leaveService.deleteLeave(tenantId, id);
  }
}
