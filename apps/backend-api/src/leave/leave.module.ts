import { Module } from '@nestjs/common';

import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveBalanceService } from './leave-balance.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LeaveController],
  providers: [LeaveService, LeaveBalanceService],
  exports: [LeaveService, LeaveBalanceService],
})
export class LeaveModule {}