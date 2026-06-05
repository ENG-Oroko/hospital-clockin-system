import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Leave } from './entity/leave-entity';
import { LeaveBalance } from './leave-balance.entity';

import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Leave,
      LeaveBalance,
    ]),
  ],

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