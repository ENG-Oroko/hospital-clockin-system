import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DatabaseService } from '../database/database.service'; // adjust path as needed
import { UserRole } from '../employee/users/enum/user-role.enum'; // adjust path as needed
import { AttendanceLog , Prisma } from '@chronos/database';
class IngestLogDto {
  userId: string;
  deviceId: string;
  direction: 'IN' | 'OUT';
  timestamp: Date;
  rosterAssignmentId?: string;
}

class BulkIngestDto {
  logs: IngestLogDto[];
}

class ManualOverrideDto {
  firstIn?: Date;
  lastOut?: Date;
  status?: string;
  totalHours?: number;
  lateMinutes?: number;
  overtimeHours?: number;
  justification: string;
}

class RecalculateDto {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly db: DatabaseService,
  ) {}

  // ===== INGEST ENDPOINTS =====

  @Post('ingest')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async ingestLog(@Body() dto: IngestLogDto, @Req() req: any) {
    return this.attendanceService.ingestLog({
      ...dto,
      tenantId: req.user.tenantId,
    });
  }

  @Post('ingest/bulk')
  @Roles(UserRole.ADMIN)
  async bulkIngest(@Body() dto: BulkIngestDto, @Req() req: any) {
    const logsWithTenant = dto.logs.map(log => ({
      ...log,
      tenantId: req.user.tenantId,
    }));
    return this.attendanceService.bulkIngest(logsWithTenant);
  }

  // ===== SUMMARY ENDPOINTS =====

  @Get('summaries')
  async getSummaries(
    @Query('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('status') status: string,
    @Query('departmentId') departmentId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: any,
  ) {
    return this.attendanceService.getSummaries({
      tenantId: req.user.tenantId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      departmentId,
      page,
      limit,
    });
  }

  @Get('summaries/daily/:date')
  async getDailyBreakdown(@Param('date') date: string, @Req() req: any) {
    return this.attendanceService.getDailyBreakdown(
      req.user.tenantId,
      new Date(date),
    );
  }

  @Get('summaries/:id')
  async getSummaryById(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const summary = await this.db.attendanceSummary.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });
    return summary;
  }

  // ===== ADMIN/MANAGER ENDPOINTS =====

  @Put('summaries/:id/override')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async manualOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualOverrideDto,
    @Req() req: any,
  ) {
    return this.attendanceService.manualOverride(
      req.user.tenantId,
      req.user.id,
      id,
      dto,
    );
  }

  @Get('summaries/:id/audit')
  @Roles(UserRole.ADMIN)
  async getAuditTrail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<any> {
    return this.attendanceService.getAuditTrail(
      req.user.tenantId,
      id,
    );
  }

  @Post('recalculate')
  @Roles(UserRole.ADMIN)
  async recalculateRange(@Body() dto: RecalculateDto, @Req() req: any) {
    return this.attendanceService.recalculateRange(
      req.user.tenantId,
      new Date(dto.startDate),
      new Date(dto.endDate),
      dto.userId,
    );
  }

  // ===== RAW LOGS =====

  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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

  // ===== DASHBOARD =====

  @Get('dashboard/stats')
  async getDashboardStats(@Query('date') date: string, @Req() req: any) {
    return this.attendanceService.getDashboardStats(
      req.user.tenantId,
      date ? new Date(date) : new Date(),
    );
  }
}