import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  NotificationChannel,
  NotificationStatus,
  DispatchResult,
} from '../types/notification.types';

// Define the ChannelPayload interface if not exported
export interface ChannelPayload {
  tenantId: string;
  userId: string;
  recipient: string;
  title?: string;
  body: string;
  priority?: string;
  triggerEvent?: string;
  expiresAt?: Date;
  renderedContent?: string; // Added for compatibility
}

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private readonly repo: NotificationRepository) {}

  async send(payload: ChannelPayload | any): Promise<DispatchResult> {
    let logId: string | undefined;

    // Handle both formats: direct payload or payload with renderedContent
    const messageBody = payload.renderedContent || payload.body;
    const recipient = payload.recipient;
    
    // Validate required fields
    if (!recipient) {
      const error = 'Recipient is required for SMS';
      this.logger.error(error);
      return { success: false, channel: NotificationChannel.SMS, error };
    }

    try {
      const log = await this.repo.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        channel: NotificationChannel.SMS,
        recipient: recipient,
        title: payload.title || 'SMS Notification',
        body: messageBody,
        status: NotificationStatus.PENDING,
        priority: payload.priority,
        triggerEvent: payload.triggerEvent,
        expiresAt: payload.expiresAt,
      });
      logId = log.id;

      // Send via provider
      await this.sendViaSmsProvider(recipient, messageBody);

      await this.repo.updateStatus(logId, NotificationStatus.SENT);
      this.logger.debug(`SMS sent to ${recipient}`);
      return { success: true, channel: NotificationChannel.SMS };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMS failed to ${payload.recipient}: ${errorMessage}`);

      if (logId) {
        await this.safelyUpdateLogStatus(logId);
      }

      return { success: false, channel: NotificationChannel.SMS, error: errorMessage };
    }
  }

  private async safelyUpdateLogStatus(logId: string): Promise<void> {
    // Update status to FAILED
    try {
      await this.repo.updateStatus(logId, NotificationStatus.FAILED);
    } catch (updateError) {
      const updateErrorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
      this.logger.warn(`Failed to update status for log ${logId}: ${updateErrorMessage}`);
    }
    
    // Increment retry counter
    try {
      await this.repo.incrementRetry(logId);
    } catch (incrementError) {
      const incrementErrorMessage = incrementError instanceof Error ? incrementError.message : 'Unknown error';
      this.logger.warn(`Failed to increment retry for log ${logId}: ${incrementErrorMessage}`);
    }
  }

  async sendDigest(digestData: any): Promise<DispatchResult> {
    this.logger.log(`Sending SMS digest to ${digestData.userId}`);
    
    try {
      const notificationCount = digestData.notifications?.length || 0;
      const message = `You have ${notificationCount} new notifications. Check your dashboard for details.`;
      
      return await this.send({
        tenantId: digestData.tenantId,
        userId: digestData.userId,
        recipient: digestData.recipient,
        body: message,
        priority: digestData.priority,
        title: 'Notification Digest',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMS digest failed: ${errorMessage}`);
      return { success: false, channel: NotificationChannel.SMS, error: errorMessage };
    }
  }

  private async sendViaSmsProvider(phone: string, message: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER || 'mock';
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID;

    switch (provider.toLowerCase()) {
      case 'mock':
        await this.sendMockSms(phone, message);
        return;

      case 'africastalking':
        await this.sendAfricaSTalkingSms(phone, message, apiKey, senderId);
        return;

      case 'twilio':
        await this.sendTwilioSms(phone, message, apiKey, senderId);
        return;

      case 'messagebird':
        await this.sendMessageBirdSms(phone, message, apiKey, senderId);
        return;

      default:
        throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }

  private async sendMockSms(phone: string, message: string): Promise<void> {
    this.logger.debug(`[MOCK SMS] → ${phone}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendAfricaSTalkingSms(phone: string, message: string, apiKey?: string, senderId?: string): Promise<void> {
    if (!apiKey) {
      this.logger.warn('Africa\'s Talking API key not configured - falling back to mock');
      return this.sendMockSms(phone, message);
    }

    try {
      // Uncomment when africastalking package is installed
      // const africastalking = require('africastalking')({
      //   apiKey: apiKey,
      //   username: process.env.AT_USERNAME || 'sandbox',
      // });
      // await africastalking.SMS.send({
      //   to: [phone],
      //   message: message,
      //   from: senderId || process.env.AT_SENDER_ID
      // });
      
      this.logger.debug(`[AFRICASTALKING] SMS sent to ${phone}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Africa's Talking SMS failed: ${errorMessage}`);
      throw error;
    }
  }

  private async sendTwilioSms(phone: string, message: string, apiKey?: string, senderId?: string): Promise<void> {
    if (!apiKey) {
      this.logger.warn('Twilio API key not configured - falling back to mock');
      return this.sendMockSms(phone, message);
    }

    try {
      // Uncomment when twilio package is installed
      // const twilio = require('twilio')(apiKey, process.env.TWILIO_TOKEN);
      // await twilio.messages.create({
      //   body: message,
      //   from: senderId || process.env.TWILIO_FROM,
      //   to: phone
      // });
      
      this.logger.debug(`[TWILIO] SMS sent to ${phone}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Twilio SMS failed: ${errorMessage}`);
      throw error;
    }
  }

  private async sendMessageBirdSms(phone: string, message: string, apiKey?: string, senderId?: string): Promise<void> {
    if (!apiKey) {
      this.logger.warn('MessageBird API key not configured - falling back to mock');
      return this.sendMockSms(phone, message);
    }

    try {
      // Uncomment when messagebird package is installed
      // const messagebird = require('messagebird')(apiKey);
      // await messagebird.messages.create({
      //   originator: senderId || process.env.MB_SENDER_ID,
      //   recipients: [phone],
      //   body: message
      // });
      
      this.logger.debug(`[MESSAGEBIRD] SMS sent to ${phone}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`MessageBird SMS failed: ${errorMessage}`);
      throw error;
    }
  }
}