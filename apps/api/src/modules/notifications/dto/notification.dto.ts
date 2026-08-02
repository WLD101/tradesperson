import { z } from 'zod';
import { NotificationChannel } from '@prisma/client';

export const SendNotificationSchema = z.object({
  channel: z.enum([NotificationChannel.EMAIL, NotificationChannel.SMS]),
  recipient: z.string(),
  template: z.string(),
  payload: z.record(z.string(), z.any()),
});

export type SendNotificationDto = z.infer<typeof SendNotificationSchema>;
