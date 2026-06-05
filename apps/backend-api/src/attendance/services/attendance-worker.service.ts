import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class AttendanceWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceWorkerService.name);

  onModuleInit() {
    this.logger.log('Attendance queue workers are disabled until QueueService exposes a processing contract.');
  }
}
