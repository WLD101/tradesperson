import { z } from 'zod';

export const CreateSubscriptionCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Stripe Price ID is required'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const CreateInvoiceCheckoutSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID required'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const CreatePublicTrialCheckoutSchema = z.object({
  packageKey: z.enum(['starter', 'pro', 'enterprise']),
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  branchCount: z.coerce.number().int().min(1).max(100),
  installerCount: z.coerce.number().int().min(1).max(1000),
  monthlyJobs: z.coerce.number().int().min(0).max(100000),
  primaryGoal: z.string().trim().max(240).optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateSubscriptionCheckoutDto = z.infer<typeof CreateSubscriptionCheckoutSchema>;
export type CreateInvoiceCheckoutDto = z.infer<typeof CreateInvoiceCheckoutSchema>;
export type CreatePublicTrialCheckoutDto = z.infer<typeof CreatePublicTrialCheckoutSchema>;
