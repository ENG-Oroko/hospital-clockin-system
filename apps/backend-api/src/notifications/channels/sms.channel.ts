import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  NotificationChannel,
  NotificationStatus,
  DispatchResult,
} from '../types/notification.types';
import { ChannelPayload } from './in-app.channel';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private readonly repo: NotificationRepository) {}

  async send(payload: ChannelPayload): Promise<DispatchResult> {
    let logId: string | undefined;

    try {
      const log = await this.repo.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        channel: NotificationChannel.SMS,
        recipient: payload.recipient,
        title: payload.title,
        body: payload.body,
        status: NotificationStatus.PENDING,
        priority: payload.priority,
        triggerEvent: payload.triggerEvent,
        expiresAt: payload.expiresAt,
      });
      logId = log.id;

      await this.sendViaSmsProvider(payload.recipient, payload.body);

      await this.repo.updateStatus(logId, NotificationStatus.SENT);
      this.logger.debug(`SMS sent to ${payload.recipient}`);
      return { success: true, channel: NotificationChannel.SMS };
    } catch (error) {
      this.logger.error(`SMS failed to ${payload.recipient}: ${error.message}`);
      if (logId) {
        await this.repo.updateStatus(logId, NotificationStatus.FAILED).catch(() => {});
        await this.repo.incrementRetry(logId).catch(() => {});
      }
      return { success: false, channel: NotificationChannel.SMS, error: error.message };
    }
  }

  private async sendViaSmsProvider(phone: string, message: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER || 'mock';

    switch (provider) {
      case 'mock':
        this.logger.warn(`[MOCK SMS] → ${phone}: ${message}`);
        return;

      case 'africastalking': {
        // npm install africastalking
        // const AT = require('africastalking')({
        //   apiKey: process.env.AT_API_KEY,
        //   username: process.env.AT_USERNAME,
        // });
        // await AT.SMS.send({ to: [phone], message, from: process.env.AT_SENDER_ID });
        throw new Error("Africa's Talking: uncomment provider code and install 'africastalking'");
      }

      case 'twilio': {
        // npm install twilio
        // const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        // await twilio.messages.create({ body: message, from: process.env.TWILIO_FROM, to: phone });
        throw new Error("Twilio: uncomment provider code and install 'twilio'");
      }

      default:
        throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }
}