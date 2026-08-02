import { z } from 'zod';

export const AllowedEntityTypes = z.enum(['JOB', 'CUSTOMER', 'QUOTE', 'REQUISITION', 'PRODUCT']);
export type EntityType = z.infer<typeof AllowedEntityTypes>;

export const AllowedMimeTypes = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MaxSizeByEntity: Record<EntityType, number> = {
  JOB: 50 * 1024 * 1024,        // 50MB
  CUSTOMER: 20 * 1024 * 1024,   // 20MB
  QUOTE: 15 * 1024 * 1024,      // 15MB
  REQUISITION: 20 * 1024 * 1024,// 20MB
  PRODUCT: 15 * 1024 * 1024,    // 15MB
};

export const RequestUploadUrlSchema = z.object({
  entityType: AllowedEntityTypes,
  entityId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  contentType: z.enum([
    'application/pdf',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
  ], {
    message: 'Unsupported file type.',
  }),
  sizeBytes: z.number().positive(),
}).refine((data) => data.sizeBytes <= MaxSizeByEntity[data.entityType], {
  message: 'File size exceeds allowed limit for this category.',
  path: ['sizeBytes'],
});

export type RequestUploadUrlDto = z.infer<typeof RequestUploadUrlSchema>;
