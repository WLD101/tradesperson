import { Injectable, Logger } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: Twilio | null = null;
  private readonly fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '+15005550006';

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set. Operating in mock mode.');
    }
  }

  async sendSms(to: string, body: string): Promise<string> {
    if (!this.client) {
      this.logger.log(`[Mock Mode] SMS to ${to} - Body: ${body}`);
      return `mock-sms-id-${Date.now()}`;
    }

    try {
      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to,
      });
      return message.sid;
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      throw error;
    }
  }
}
