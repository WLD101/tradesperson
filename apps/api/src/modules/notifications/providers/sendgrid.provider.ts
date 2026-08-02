import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendGridProvider {
  private readonly logger = new Logger(SendGridProvider.name);
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@tradesperson.network';
    
    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY is not set. Operating in mock mode.');
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<string> {
    if (!this.apiKey) {
      this.logger.log(`[Mock Mode] Email to ${to} - Subject: ${subject} - Body: ${html.substring(0, 100)}...`);
      return `mock-email-id-${Date.now()}`;
    }

    try {
      const msg = {
        to,
        from: this.fromEmail,
        subject,
        html,
      };
      
      const response = await sgMail.send(msg);
      const messageId = response[0].headers['x-message-id'] || `sg-${Date.now()}`;
      return messageId as string;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
