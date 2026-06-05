import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  NotificationChannel,
  NotificationStatus,
  DispatchResult,
} from '../types/notification.types';
import { ChannelPayload } from './in-app.channel';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly repo: NotificationRepository) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(payload: ChannelPayload): Promise<DispatchResult> {
    let logId: string | undefined;

    try {
      const log = await this.repo.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        channel: NotificationChannel.EMAIL,
        recipient: payload.recipient,
        title: payload.title,
        body: payload.body,
        status: NotificationStatus.PENDING,
        priority: payload.priority,
        triggerEvent: payload.triggerEvent,
        actions: payload.actions,
        expiresAt: payload.expiresAt,
      });
      logId = log.id;

      const htmlBody = this.buildHtml(payload.title, payload.body, payload.actions);

      await this.transporter.sendMail({
        from: `Chronos HR <${process.env.SMTP_FROM || 'noreply@chronos.hospital'}>`,
        to: payload.recipient,
        subject: payload.title,
        text: payload.body,
        html: htmlBody,
      });

      await this.repo.updateStatus(logId, NotificationStatus.SENT);
      this.logger.debug(`Email sent to ${payload.recipient}`);
      return { success: true, channel: NotificationChannel.EMAIL };
    } catch (error) {
      this.logger.error(`Email failed to ${payload.recipient}: ${error.message}`);
      if (logId) {
        await this.repo.updateStatus(logId, NotificationStatus.FAILED).catch(() => {});
        await this.repo.incrementRetry(logId).catch(() => {});
      }
      return { success: false, channel: NotificationChannel.EMAIL, error: error.message };
    }
  }

  private buildHtml(title: string, body: string, actions?: any[]): string {
    const actionButtons = (actions ?? [])
      .filter((a) => a.url)
      .map(
        (a) =>
          `<a href="${a.url}" style="display:inline-block;margin:4px;padding:8px 16px;background:#2563eb;color:#fff;border-radius:4px;text-decoration:none;font-size:14px">${a.label}</a>`,
      )
      .join('');

    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1e3a5f;padding:16px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Chronos HR</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <h3 style="color:#1e3a5f;margin-top:0">${title}</h3>
          <p style="color:#374151;line-height:1.6;white-space:pre-line">${body}</p>
          ${actionButtons ? `<div style="margin-top:16px">${actionButtons}</div>` : ''}
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:16px">
          This is an automated notification from Chronos HR System. Do not reply to this email.
        </p>
      </div>
    `;
  }
}