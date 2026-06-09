import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LeaveController],

  providers: [
    LeaveService,
    LeaveBalanceService,
  ],

  exports: [
    LeaveService,
    LeaveBalanceService,
  ],
})
export class LeaveModule {}