import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../services/prisma.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly gateway: EventsGateway,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  emitInvoicePaid(tenantId: string, invoiceId: string) {
    this.logger.log(`Emitting invoice.paid for tenant ${tenantId}, invoice ${invoiceId}`);
    this.gateway.server.to(`tenant_${tenantId}`).emit('invoice.paid', { invoiceId });
  }

  emitEstimateSigned(tenantId: string, estimateId: string) {
    this.logger.log(`Emitting estimate.signed for tenant ${tenantId}, estimate ${estimateId}`);
    this.gateway.server.to(`tenant_${tenantId}`).emit('estimate.signed', { estimateId });
  }

  async emitJobStatusChanged(tenantId: string, jobId: string, newStatus: string) {
    this.logger.log(`Emitting job.status.changed for tenant ${tenantId}, job ${jobId}, status ${newStatus}`);
    this.gateway.server.to(`tenant_${tenantId}`).emit('job.status.changed', { jobId, newStatus });

    if (newStatus === 'DISPATCHED') {
      const job = await this.prisma.client.job.findUnique({
        where: { id: jobId },
        include: { customer: true }
      });
      if (job && job.customer?.primaryPhone) {
        await this.notifications.sendAppointmentReminder(tenantId, jobId, job.customer.primaryPhone);
      }
    }
  }
}
