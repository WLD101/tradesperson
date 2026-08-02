import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SendGridProvider } from './providers/sendgrid.provider';
import { TwilioProvider } from './providers/twilio.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SendGridProvider, TwilioProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
