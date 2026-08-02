import { Controller, Post, Req, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';

@Controller({ path: 'billing/webhook', version: '1' })
export class WebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'];
    
    if (!signature || !req.rawBody) {
      throw new Error('Missing stripe signature or raw body');
    }

    return this.billingService.handleWebhookEvent(
      (Array.isArray(signature) ? signature[0] : signature) || '',
      req.rawBody
    );
  }
}
