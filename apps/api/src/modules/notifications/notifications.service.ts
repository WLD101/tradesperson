import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { ResendProvider } from './providers/resend.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { loadEnv } from '@tradesperson/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly env = loadEnv();
  private readonly appUrl = this.env.API_URL?.replace('/api', '') || 'http://localhost:3000'; // Defaulting to web URL

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendProvider,
    private readonly twilio: TwilioProvider,
  ) {}

  async sendPortalInvite(
    tenantId: string,
    type: 'estimate' | 'invoice',
    token: string,
    recipientEmail?: string | null,
    recipientPhone?: string | null,
  ) {
    const url = `${this.appUrl}/portal/${type}s/${token}`;
    
    // Background execution without awaiting, to avoid blocking request paths
    setTimeout(async () => {
      try {
        if (recipientEmail) {
          await this.dispatchEmail(
            tenantId,
            recipientEmail,
            `Your Tradesperson ${type === 'estimate' ? 'Estimate' : 'Invoice'}`,
            `<p>Hello,</p><p>Please review your ${type} here: <a href="${url}">${url}</a></p>`,
            `${type}_invite`
          );
        }

        if (recipientPhone) {
          await this.dispatchSms(
            tenantId,
            recipientPhone,
            `View your tradesperson ${type}: ${url}`,
            `${type}_invite`
          );
        }
      } catch (err: any) {
        this.logger.error(`Failed to send portal invite for ${type} ${token}: ${err.message}`);
      }
    }, 0);
  }

  async sendPaymentReceipt(tenantId: string, invoiceId: string, recipientEmail: string) {
    setTimeout(async () => {
      try {
        await this.dispatchEmail(
          tenantId,
          recipientEmail,
          'Payment Receipt',
          `<p>Thank you! Your payment for invoice has been received successfully.</p>`,
          'payment_receipt'
        );
      } catch (err: any) {
        this.logger.error(`Failed to send payment receipt for ${invoiceId}: ${err.message}`);
      }
    }, 0);
  }

  async sendAppointmentReminder(tenantId: string, jobId: string, recipientPhone: string) {
    setTimeout(async () => {
      try {
        await this.dispatchSms(
          tenantId,
          recipientPhone,
          `Your technician has been dispatched for your upcoming job!`,
          'appointment_reminder'
        );
      } catch (err: any) {
        this.logger.error(`Failed to send appointment reminder for ${jobId}: ${err.message}`);
      }
    }, 0);
  }

  private async dispatchEmail(tenantId: string, recipient: string, subject: string, html: string, template: string) {
    let status: NotificationStatus = NotificationStatus.PENDING;
    let errorMessage: string | null = null;
    
    try {
      await this.resend.sendEmail(recipient, subject, html);
      status = NotificationStatus.SENT;
    } catch (error: any) {
      status = NotificationStatus.FAILED;
      errorMessage = error.message;
    }

    await this.logNotification(tenantId, recipient, NotificationChannel.EMAIL, template, status, errorMessage);
  }

  private async dispatchSms(tenantId: string, recipient: string, body: string, template: string) {
    let status: NotificationStatus = NotificationStatus.PENDING;
    let errorMessage: string | null = null;
    
    try {
      await this.twilio.sendSms(recipient, body);
      status = NotificationStatus.SENT;
    } catch (error: any) {
      status = NotificationStatus.FAILED;
      errorMessage = error.message;
    }

    await this.logNotification(tenantId, recipient, NotificationChannel.SMS, template, status, errorMessage);
  }

  private async logNotification(
    tenantId: string,
    recipient: string,
    channel: NotificationChannel,
    template: string,
    status: NotificationStatus,
    errorMessage: string | null
  ) {
    try {
      await this.prisma.client.notificationLog.create({
        data: {
          tenantId,
          recipient,
          channel,
          template,
          status,
          errorMessage,
        }
      });
    } catch (err: any) {
      this.logger.error(`Failed to log notification: ${err.message}`);
    }
  }
}
