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
    Req,
    UseGuards,
  } from '@nestjs/common';
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
      @Req() req: any,
    ): Promise<ILeave> {
      return this.leaveService.createLeave({
        ...dto,
        tenantId: req.user.tenantId,
      });
    }
  
    @Get()
    async getAllLeaves(
      @Req() req: any,
      @Query('status') status?: LeaveStatus,
    ): Promise<ILeave[]> {
      if (status) {
        return this.leaveService.getLeavesByStatus(req.user.tenantId, status);
      }
      return this.leaveService.getAllLeaves(req.user.tenantId);
    }
  
    @Get('employee/:employeeId')
    async getLeavesByEmployee(
      @Param('employeeId', ParseUUIDPipe) employeeId: string,
      @Req() req: any,
    ): Promise<ILeave[]> {
      return this.leaveService.getLeavesByEmployee(
        req.user.tenantId,
        employeeId,
      );
    }
  
    @Get(':id')
    async getLeaveById(
      @Param('id', ParseUUIDPipe) id: string,
      @Req() req: any,
    ): Promise<ILeave> {
      return this.leaveService.getLeaveById(req.user.tenantId, id);
    }
  
    @Patch(':id/status')
    async updateLeaveStatus(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateLeaveStatusDto,
      @Req() req: any,
    ): Promise<ILeave> {
      return this.leaveService.updateLeaveStatus(req.user.tenantId, id, dto);
    }
  
    @Patch(':id/cancel')
    async cancelLeave(
      @Param('id', ParseUUIDPipe) id: string,
      @Body('employeeId', ParseUUIDPipe) employeeId: string,
      @Req() req: any,
    ): Promise<ILeave> {
      return this.leaveService.cancelLeave(req.user.tenantId, id, employeeId);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteLeave(
      @Param('id', ParseUUIDPipe) id: string,
      @Req() req: any,
    ): Promise<void> {
      return this.leaveService.deleteLeave(req.user.tenantId, id);
    }
  }