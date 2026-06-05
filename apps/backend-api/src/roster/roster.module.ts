import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RosterController } from './roster.controller';
import { RosterRepository } from './roster.repository';
import { RosterService } from './roster.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RosterController],
  providers: [RosterRepository, RosterService],
  exports: [RosterService],
})
export class RosterModule {}
