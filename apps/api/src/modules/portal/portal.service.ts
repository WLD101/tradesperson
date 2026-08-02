import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { EventsService } from '../events/events.service';
import { AcceptEstimateDto } from './dto/portal.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly notifications: NotificationsService,
  ) {}

  async sendPortalInvite(token: string, type: 'estimate' | 'invoice') {
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    let tenantId: string | null = null;

    if (type === 'invoice') {
      const invoice = await this.prisma.client.invoice.findUnique({
        where: { portalToken: token },
        include: { customer: true }
      });
      if (invoice) {
        customerEmail = invoice.customer?.primaryEmail || null;
        customerPhone = invoice.customer?.primaryPhone || null;
        tenantId = invoice.tenantId;
      }
    } else {
      const estimate = await this.prisma.client.estimate.findUnique({
        where: { portalToken: token },
        include: { customer: true }
      });
      if (estimate) {
        customerEmail = estimate.customer?.primaryEmail || null;
        customerPhone = estimate.customer?.primaryPhone || null;
        tenantId = estimate.tenantId;
      }
    }

    if (tenantId) {
      await this.notifications.sendPortalInvite(tenantId, type, token, customerEmail, customerPhone);
    }
  }

  async getPublicInvoiceByToken(token: string) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { portalToken: token },
      include: {
        tenant: {
          select: {
            name: true,
            businessEmail: true,
            businessPhone: true,
            website: true,
          }
        },
        customer: {
          select: {
            displayName: true,
            companyName: true,
            primaryEmail: true,
            primaryPhone: true,
          }
        },
        job: {
          select: {
            title: true,
            workNotes: true,
          }
        },
      }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or invalid token');
    }

    if (invoice.portalTokenExpiresAt && invoice.portalTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invoice link has expired');
    }

    return invoice;
  }

  async getPublicEstimateByToken(token: string) {
    const estimate = await this.prisma.client.estimate.findUnique({
      where: { portalToken: token },
      include: {
        tenant: {
          select: {
            name: true,
            businessEmail: true,
            businessPhone: true,
            website: true,
          }
        },
        customer: {
          select: {
            displayName: true,
            companyName: true,
            primaryEmail: true,
            primaryPhone: true,
          }
        },
        lines: true,
      }
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found or invalid token');
    }

    if (estimate.portalTokenExpiresAt && estimate.portalTokenExpiresAt < new Date()) {
      throw new BadRequestException('Estimate link has expired');
    }

    return estimate;
  }

  async acceptEstimate(token: string, dto: AcceptEstimateDto) {
    // 1. Fetch estimate
    const estimate = await this.getPublicEstimateByToken(token);

    if (!['DRAFT', 'CALCULATED', 'READY_FOR_QUOTE', 'QUOTED'].includes(estimate.status)) {
      throw new BadRequestException(`Estimate cannot be accepted because its status is ${estimate.status}`);
    }

    // 2. Transaction to update estimate and create a Job
    return this.prisma.client.$transaction(async (tx: any) => {
      // Update estimate to APPROVED
      const updatedEstimate = await tx.estimate.update({
        where: { id: estimate.id },
        data: {
          status: 'APPROVED',
          signatureData: dto.signatureData,
          signedAt: new Date(),
          customerNotes: `Signed and accepted by: ${dto.signerName}`,
        }
      });

      // Automatically create a Job from the approved estimate
      const newJob = await tx.job.create({
        data: {
          tenantId: estimate.tenantId,
          branchId: estimate.branchId,
          customerId: estimate.customerId,
          siteId: estimate.siteId,
          jobNumber: `JOB-${estimate.estimateNumber}`,
          title: estimate.title || `Job for Estimate ${estimate.estimateNumber}`,
          status: 'SCHEDULED',
          currency: estimate.currency,
          totalValue: estimate.grandTotal,
          depositRequired: 0,
          depositPaid: 0,
        }
      });

      // Emit real-time WebSocket event for dispatchers
      this.events.emitEstimateSigned(estimate.tenantId, estimate.id);
      this.events.emitJobStatusChanged(estimate.tenantId, newJob.id, 'SCHEDULED');

      return {
        message: 'Estimate accepted successfully',
        estimate: updatedEstimate,
        jobId: newJob.id,
      };
    });
  }
}
