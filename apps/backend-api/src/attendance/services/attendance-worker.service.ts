import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceProcessorService } from './attendance-processor.service';

// FIXED: DatabaseService → PrismaService (DatabaseService does not exist)

@Injectable()
export class AttendanceWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceWorkerService.name);

  constructor(
    private readonly queue: QueueService,
    private readonly db: PrismaService,
    private readonly processor: AttendanceProcessorService,
  ) {}

  async onModuleInit() {
    this.logger.log('Attendance worker service initialized');
  }
}