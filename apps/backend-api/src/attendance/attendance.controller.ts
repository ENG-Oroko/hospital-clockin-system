import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AttendanceLog } from '@chronos/database';
import { UserRole } from '@chronos/types-common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { AttendanceService } from './attendance.service';

class IngestLogDto {
  userId?: string;
  deviceId: string;
  devicePin?: string;
  direction: 'IN' | 'OUT';
  timestamp: string;
  rosterAssignmentId?: string;
}

class BulkIngestDto {
  logs: IngestLogDto[];
}

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('ingest')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  async ingestLog(@Body() dto: IngestLogDto, @Req() req: any) {
    return this.attendanceService.ingestLog({
      ...dto,
      tenantId: req.user.tenantId,
      timestamp: new Date(dto.timestamp),
    });
  }

  @Post('ingest/bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  async bulkIngest(@Body() dto: BulkIngestDto, @Req() req: any) {
    return this.attendanceService.bulkIngest(
      dto.logs.map((log) => ({
        ...log,
        tenantId: req.user.tenantId,
        timestamp: new Date(log.timestamp),
      })),
    );
  }

  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  async getRawLogs(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('direction') direction: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: any,
  ): Promise<{ data: AttendanceLog[]; total: number; page: number; limit: number }> {
    return this.attendanceService.getRawLogs(req.user.tenantId, {
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      direction,
      page,
      limit,
    });
  }

  @Get('logs/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  async getLogById(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.attendanceService.getRawLogById(req.user.tenantId, id);
  }
}
