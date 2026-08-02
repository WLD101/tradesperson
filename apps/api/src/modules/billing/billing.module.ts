import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController, PublicBillingController } from './billing.controller';
import { WebhookController } from './webhook.controller';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EventsModule, NotificationsModule],
  providers: [BillingService],
  controllers: [BillingController, PublicBillingController, WebhookController],
  exports: [BillingService],
})
export class BillingModule {}
