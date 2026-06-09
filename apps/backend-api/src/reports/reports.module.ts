import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repositories';
import { ReportsService } from './reports.service';
import { StreamQueryProcessor } from './stream-query-processor';
import { DocumentCompiler } from './document-compiler';
import { ReportsQueueService } from './reports-queue.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService, StreamQueryProcessor, DocumentCompiler, ReportsQueueService],
  exports: [ReportsQueueService],
})
export class ReportsModule {}