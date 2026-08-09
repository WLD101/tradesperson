import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ResendProvider } from './providers/resend.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, ResendProvider, TwilioProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
