// jobs/notification.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { DispatcherService } from '../services/dispatcher.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly dispatcher: DispatcherService) {}

  @Process('send')
  async handleSend(job: Job) {
    this.logger.debug(`Processing job ${job.id}`);
    
    const { payload, rendered, channels, notificationIds } = job.data;
    
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      const notificationId = notificationIds.find(([c]: [string, string]) => c === channel)?.[1];
      
      try {
        // Implement channel sending logic here
        this.logger.debug(`Sending to ${channel}: ${notificationId}`);
      } catch (error) {
        this.logger.error(`Failed: ${error.message}`);
        throw error;
      }
    }
    
    return { success: true };
  }
}