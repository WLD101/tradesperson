import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreatePublicTrialCheckoutSchema, CreateSubscriptionCheckoutSchema, CreateInvoiceCheckoutSchema } from './dto/billing.dto';
import { AuthGuard } from '../../shared/auth.guard';
import { CurrentSession } from '../../shared/session.decorator';

@Controller({ path: 'public/billing', version: '1' })
export class PublicBillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('trial-checkout')
  async createTrialCheckout(@Body() body: unknown) {
    const dto = CreatePublicTrialCheckoutSchema.parse(body);
    return this.billingService.createPublicTrialCheckout(dto);
  }
}

@Controller({ path: 'billing', version: '1' })
@UseGuards(AuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscription/checkout')
  async createSubscriptionCheckout(
    @CurrentSession() session: any,
    @Body() body: unknown,
  ) {
    if (!session.activeTenantId) throw new Error('Tenant required');
    const dto = CreateSubscriptionCheckoutSchema.parse(body);
    return this.billingService.createSubscriptionCheckout(session.activeTenantId, dto);
  }

  @Post('subscription/portal')
  async createCustomerPortal(
    @CurrentSession() session: any,
    @Body('returnUrl') returnUrl: string,
  ) {
    if (!session.activeTenantId) throw new Error('Tenant required');
    if (!returnUrl) throw new Error('returnUrl is required');
    return this.billingService.createCustomerPortal(session.activeTenantId, returnUrl);
  }

  @Post('invoice/checkout')
  async createInvoiceCheckout(
    @CurrentSession() session: any,
    @Body() body: unknown,
  ) {
    if (!session.activeTenantId) throw new Error('Tenant required');
    const dto = CreateInvoiceCheckoutSchema.parse(body);
    return this.billingService.createInvoiceCheckout(session.activeTenantId, dto);
  }
}
