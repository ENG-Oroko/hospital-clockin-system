import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { DatabaseService } from '../../database/database.service';
import { AttendanceProcessorService } from './attendance-processor.service';

@Injectable()
export class AttendanceWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceWorkerService.name);

  constructor(
    private readonly queue: QueueService,
    private readonly db: DatabaseService,
    private readonly processor: AttendanceProcessorService,
  ) {}

  async onModuleInit() {
    this.logger.log('Attendance worker service initialized');

}
}