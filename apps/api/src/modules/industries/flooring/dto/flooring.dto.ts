import { z } from 'zod';

export const CalculateRollCutSchema = z.object({
  rollId: z.string().uuid(),
  jobId: z.string().uuid(),
  cutLengthFt: z.number().positive('Cut length must be greater than zero.'),
  wasteLengthFt: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export type CalculateRollCutDto = z.infer<typeof CalculateRollCutSchema>;

export const EstimateFlooringSchema = z.object({
  netAreaSqFt: z.number().positive(),
  rollWidthFt: z.number().default(12),
  wasteFactorPercent: z.number().min(0).max(50).default(10), // e.g., 10% standard waste
});

export type EstimateFlooringDto = z.infer<typeof EstimateFlooringSchema>;
