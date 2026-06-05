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
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { ILeave } from './interfaces/leave.interface';
import { LeaveStatus } from './enums/leave-status.enum';

@Controller('leaves')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLeave(@Body() createLeaveDto: CreateLeaveDto): Promise<ILeave> {
    return this.leaveService.createLeave(createLeaveDto);
  }

  @Get()
  async getAllLeaves(
    @Query('status') status?: LeaveStatus,
  ): Promise<ILeave[]> {
    if (status) {
      return this.leaveService.getLeavesByStatus(status);
    }
    return this.leaveService.getAllLeaves();
  }

  @Get('employee/:employeeId')
  async getLeavesByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<ILeave[]> {
    return this.leaveService.getLeavesByEmployee(employeeId);
  }

  @Get(':id')
  async getLeaveById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ILeave> {
    return this.leaveService.getLeaveById(id);
  }

  @Patch(':id/status')
  async updateLeaveStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeaveStatusDto: UpdateLeaveStatusDto,
  ): Promise<ILeave> {
    return this.leaveService.updateLeaveStatus(id, updateLeaveStatusDto);
  }

  @Patch(':id/cancel')
  async cancelLeave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('employeeId', ParseUUIDPipe) employeeId: string,
  ): Promise<ILeave> {
    return this.leaveService.cancelLeave(id, employeeId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLeave(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.leaveService.deleteLeave(id);
  }
}