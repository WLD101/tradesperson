import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import Stripe from 'stripe';
import { CreateSubscriptionCheckoutDto, CreateInvoiceCheckoutDto, CreatePublicTrialCheckoutDto } from './dto/billing.dto';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private notifications: NotificationsService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2026-06-24.dahlia' as any,
    });
  }

  async createSubscriptionCheckout(tenantId: string, dto: CreateSubscriptionCheckoutDto) {
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id: tenantId },
    });
    
    if (!tenant) throw new NotFoundException('Tenant not found');

    let stripeCustomerId = tenant.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        name: tenant.name,
        metadata: { tenantId },
      });
      stripeCustomerId = customer.id;
      await this.prisma.client.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: dto.priceId, quantity: 1 }],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: { tenantId, type: 'subscription' },
    });

    return { url: session.url };
  }

  async createPublicTrialCheckout(dto: CreatePublicTrialCheckoutDto) {
    const priceId = this.resolveTrialPriceId(dto.packageKey);
    this.ensureStripeConfigured();

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: dto.email,
      payment_method_collection: 'always',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          source: 'public_onboarding',
          packageKey: dto.packageKey,
          companyName: dto.companyName,
          contactName: dto.contactName,
          branchCount: String(dto.branchCount),
          installerCount: String(dto.installerCount),
          monthlyJobs: String(dto.monthlyJobs),
        },
      },
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: {
        source: 'public_onboarding',
        packageKey: dto.packageKey,
        companyName: dto.companyName,
        contactName: dto.contactName,
        phone: dto.phone ?? '',
        primaryGoal: dto.primaryGoal ?? '',
      },
    });

    return { url: session.url };
  }

  async createCustomerPortal(tenantId: string, returnUrl: string) {
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id: tenantId },
    });
    
    if (!tenant || !tenant.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer associated with this tenant');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async createInvoiceCheckout(tenantId: string, dto: CreateInvoiceCheckoutDto) {
    const invoice = await this.prisma.client.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      include: { customer: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') throw new BadRequestException('Invoice is already paid');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Payment for Job on behalf of ${invoice.customer.displayName}`,
            },
            unit_amount: Math.round(Number(invoice.total) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      metadata: { tenantId, invoiceId: invoice.id, type: 'invoice_payment' },
    });

    await this.prisma.client.invoice.update({
      where: { id: invoice.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return { url: session.url };
  }

  async handleWebhookEvent(signature: string, rawBody: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const { tenantId, type, invoiceId } = session.metadata || {};

    if (type === 'invoice_payment' && invoiceId && tenantId) {
      await this.prisma.client.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
        },
      });

      // Broadcast the real-time event to the tenant's connected dispatchers
      this.events.emitInvoicePaid(tenantId, invoiceId);

      // Trigger payment receipt notification
      const invoice = await this.prisma.client.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true }
      });
      if (invoice && invoice.customer?.primaryEmail) {
        await this.notifications.sendPaymentReceipt(tenantId, invoiceId, invoice.customer.primaryEmail);
      }
    } else if (type === 'subscription' && tenantId) {
      // Handled primarily by customer.subscription.updated
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    
    const tenant = await this.prisma.client.tenant.findFirst({
      where: { stripeCustomerId },
    });

    if (!tenant) return;

    await this.prisma.client.stripeSubscription.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
      update: {
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    // Automatically update the tenant's SubscriptionTier based on the product (simplified logic)
    const isActive = ['active', 'trialing'].includes(subscription.status);
    await this.prisma.client.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionTier: isActive ? 'PRO' : 'FREE',
      },
    });
  }

  private resolveTrialPriceId(packageKey: CreatePublicTrialCheckoutDto['packageKey']) {
    const priceIds = {
      starter: process.env.STRIPE_STARTER_PRICE_ID,
      pro: process.env.STRIPE_PRO_PRICE_ID ?? process.env.STRIPE_PRICE_ID,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };
    const priceId = priceIds[packageKey];
    if (!priceId) {
      throw new BadRequestException(`Stripe price is not configured for ${packageKey}.`);
    }
    return priceId;
  }

  private ensureStripeConfigured() {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
      throw new BadRequestException('Stripe secret key is not configured.');
    }
  }
}
