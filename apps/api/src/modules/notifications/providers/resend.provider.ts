import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly fromEmail =
    process.env.MAIL_FROM || 'noreply@tradesperson.network';
  private readonly client = this.apiKey ? new Resend(this.apiKey) : null;

  constructor() {
    if (!this.apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is not set. Email delivery is running in mock mode.',
      );
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<string> {
    if (!this.client) {
      this.logger.log(
        `[Mock Mode] Email to ${to} - Subject: ${subject} - Body: ${html.substring(0, 100)}...`,
      );
      return `mock-email-id-${Date.now()}`;
    }

    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data?.id ?? `resend-${Date.now()}`;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
