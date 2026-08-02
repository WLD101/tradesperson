import { z } from 'zod';

export const AcceptEstimateSchema = z.object({
  token: z.string().uuid(),
  signerName: z.string().min(2, "Signer name must be at least 2 characters long"),
  signatureData: z.string().min(1, "Signature data is required"),
});

export type AcceptEstimateDto = z.infer<typeof AcceptEstimateSchema>;
