import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  EstimateLineType,
  InvoiceStatus,
  JobStatus,
  MaterialRequirementStatus,
  Prisma,
  QuoteStatus,
  StockReservationStatus,
} from "@prisma/client/index";
import { AuditService } from "./audit.service";
import { BranchAccessService } from "./branch-access.service";
import { PrismaService } from "./prisma.service";
import { TenantAccessService } from "./tenant-access.service";

type PrismaTransaction = Prisma.TransactionClient;
type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

const JOB_INCLUDE: any = {
  branch: { select: { id: true, name: true, branchCode: true } },
  customer: { select: { id: true, displayName: true, primaryEmail: true, primaryPhone: true } },
  site: { select: { id: true, label: true, addressLine1: true, city: true, postcode: true } },
  quote: { select: { id: true, quoteNumber: true, status: true, grandTotal: true } },
  invoices: {
    orderBy: [{ createdAt: "desc" }],
    include: {
      payments: { orderBy: [{ paidAt: "desc" }] },
    },
  },
  materialRequirements: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      product: { select: { id: true, name: true, sku: true } },
      productVariant: { select: { id: true, name: true, sku: true } },
      supplierProduct: { select: { id: true, supplierSku: true, supplierDescription: true } },
      sourceQuoteLine: { select: { id: true, description: true, quantity: true, unit: true } },
      purchaseRequisitionLine: {
        select: {
          id: true,
          purchaseRequisition: { select: { id: true, requisitionNumber: true, status: true } },
        },
      },
      stockReservations: {
        orderBy: [{ reservedAt: "desc" }],
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
        },
      },
    },
  },
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly audit: AuditService,
  ) {}

  async listJobs(session: TenantSession, query: any) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.JobWhereInput = {
      tenantId,
      ...this.branchAccess.branchWhere(session, tenantId),
      ...(query.status ? { status: query.status as JobStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { jobNumber: { contains: query.search, mode: "insensitive" } },
              { title: { contains: query.search, mode: "insensitive" } },
              { customer: { displayName: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.job.count({ where }),
      this.prisma.client.job.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: JOB_INCLUDE,
      }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async getJob(session: TenantSession, jobId: string) {
    return this.ensureJob(session, jobId, { include: JOB_INCLUDE });
  }

  async createFromQuote(session: TenantSession, quoteId: string, input: any) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const quote = await this.prisma.client.quote.findFirst({
      where: { id: quoteId, tenantId, ...this.branchAccess.branchWhere(session, tenantId) },
      include: {
        lines: {
          orderBy: [{ displayOrder: "asc" }],
          include: {
            sourceEstimateLine: true,
          },
        },
      },
    });
    if (!quote) throw new NotFoundException("Resource not found.");
    if (quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException("Only approved quotes can be converted to jobs.");
    }

    const job = await this.prisma.client.$transaction(async (tx) => {
      const jobNumber = await this.allocateNumber(tx, tenantId, "job", "JOB");
      const created = await tx.job.create({
        data: {
          tenantId,
          branchId: quote.branchId,
          customerId: quote.customerId,
          siteId: quote.siteId,
          quoteId: quote.id,
          jobNumber,
          status: input.status ?? JobStatus.SCHEDULED,
          title: input.title?.trim() || quote.title,
          currency: quote.currency,
          totalValue: quote.grandTotal,
          depositRequired: quote.depositRequired,
          depositPaid: quote.depositPaid,
          scheduledStart: input.scheduledStart ?? null,
          scheduledEnd: input.scheduledEnd ?? null,
          accessNotes: this.trimOrNull(input.accessNotes),
          workNotes: this.trimOrNull(input.workNotes),
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });
      await this.createMissingMaterialRequirementsTx(tx, tenantId, created, quote.lines, session.user.id);
      await tx.quote.update({ where: { id: quote.id }, data: { status: QuoteStatus.CONVERTED } });
      return tx.job.findFirstOrThrow({ where: { id: created.id, tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "job:create",
      entityType: "job",
      entityId: job.id,
      newValues: { jobNumber: job.jobNumber, quoteId },
    });
    return job;
  }

  async generateMaterialRequirements(session: TenantSession, jobId: string) {
    const job = await this.ensureJob(session, jobId, {
      include: {
        quote: {
          include: {
            lines: {
              orderBy: [{ displayOrder: "asc" }],
              include: { sourceEstimateLine: true },
            },
          },
        },
      },
    });
    if (!job.quote) {
      throw new BadRequestException("This job is not linked to a quote.");
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      await this.createMissingMaterialRequirementsTx(
        tx,
        job.tenantId,
        job,
        job.quote.lines,
        session.user.id,
      );
      return tx.job.findFirstOrThrow({ where: { id: job.id, tenantId: job.tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:material-requirements:generate",
      entityType: "job",
      entityId: job.id,
      newValues: { jobNumber: job.jobNumber },
    });

    return updated;
  }

  async createRequisitionFromRequirements(session: TenantSession, jobId: string, input: any) {
    const job = await this.ensureJob(session, jobId, { include: { materialRequirements: true } });
    if (!job.branchId) {
      throw new BadRequestException("A job branch is required before creating a requisition.");
    }

    const requestedIds = new Set<string>(input.materialRequirementIds ?? []);
    const candidates = job.materialRequirements.filter((requirement: any) => {
      if (requestedIds.size > 0 && !requestedIds.has(requirement.id)) return false;
      return this.remainingRequirementQuantity(requirement).greaterThan(0);
    });

    if (requestedIds.size > 0 && candidates.length !== requestedIds.size) {
      throw new BadRequestException("One or more selected material requirements are not available for requisition.");
    }
    if (!candidates.length) {
      throw new BadRequestException("There are no material requirements remaining to requisition.");
    }
    if (candidates.some((requirement: any) => !requirement.productId)) {
      throw new BadRequestException("Only matched product requirements can be converted to requisitions.");
    }

    const created = await this.prisma.client.$transaction(async (tx) => {
      const requisitionNumber = await this.allocateProcurementNumber(tx, job.tenantId, "purchase-requisition");
      const requisition = await tx.purchaseRequisition.create({
        data: {
          tenantId: job.tenantId,
          branchId: job.branchId,
          requisitionNumber,
          requiredDate: input.requiredDate ?? null,
          purpose:
            this.trimOrNull(input.purpose) ??
            `Materials for ${job.jobNumber}${job.title ? ` - ${job.title}` : ""}`,
          internalNotes:
            this.trimOrNull(input.internalNotes) ??
            `Created from job material requirements for ${job.jobNumber}.`,
          requestedById: session.user.id,
          lines: {
            create: candidates.map((requirement: any, index: number) => {
              const remaining = this.remainingRequirementQuantity(requirement);
              return {
                tenantId: job.tenantId,
                productId: requirement.productId,
                productVariantId: requirement.productVariantId,
                supplierProductId: requirement.supplierProductId,
                preferredSupplierId: null,
                description: requirement.description,
                requestedQuantity: remaining,
                unit: requirement.unit,
                requiredDate: input.requiredDate ?? requirement.requiredDate ?? null,
                notes: `From job ${job.jobNumber} requirement ${requirement.id}.`,
                displayOrder: index,
              };
            }),
          },
        },
        include: {
          lines: { orderBy: [{ displayOrder: "asc" }] },
        },
      });

      for (const [index, requirement] of candidates.entries()) {
        const line = requisition.lines[index];
        if (!line) continue;
        const remaining = this.remainingRequirementQuantity(requirement);
        await tx.materialRequirement.update({
          where: { id: requirement.id },
          data: {
            requisitionedQuantity: this.money(requirement.requisitionedQuantity).plus(remaining),
            purchaseRequisitionLineId: line.id,
            status: MaterialRequirementStatus.REQUISITIONED,
            updatedById: session.user.id,
          },
        });
      }

      return {
        requisition,
        job: await tx.job.findFirstOrThrow({ where: { id: job.id, tenantId: job.tenantId }, include: JOB_INCLUDE }),
      };
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:material-requirements:create-requisition",
      entityType: "job",
      entityId: job.id,
      newValues: {
        requisitionId: created.requisition.id,
        requisitionNumber: created.requisition.requisitionNumber,
        lineCount: created.requisition.lines.length,
      },
    });

    return created.job;
  }

  async reserveStockForJob(session: TenantSession, jobId: string) {
    const job = await this.ensureJob(session, jobId, {
      include: {
        materialRequirements: {
          include: { stockReservations: true },
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    const reservable = job.materialRequirements.filter((requirement: any) => {
      if (!requirement.productId) return false;
      return this.remainingToAllocate(requirement).greaterThan(0);
    });
    if (!reservable.length) {
      throw new BadRequestException("There are no product material requirements remaining to reserve.");
    }

    const reserved = await this.prisma.client.$transaction(async (tx) => {
      let reservationCount = 0;
      for (const requirement of reservable) {
        const remaining = this.remainingToAllocate(requirement);
        const balances = await tx.stockBalance.findMany({
          where: {
            tenantId: job.tenantId,
            productId: requirement.productId,
            productVariantId: requirement.productVariantId,
            supplierProductId: requirement.supplierProductId,
          },
          orderBy: [{ updatedAt: "asc" }],
        });

        let stillNeeded = remaining;
        for (const balance of balances) {
          if (stillNeeded.lessThanOrEqualTo(0)) break;
          const available = this.money(balance.onHandQuantity).minus(this.money(balance.reservedQuantity));
          if (available.lessThanOrEqualTo(0)) continue;

          const reserveQuantity = Prisma.Decimal.min(available, stillNeeded);
          await tx.stockBalance.update({
            where: { id: balance.id },
            data: { reservedQuantity: { increment: reserveQuantity } },
          });
          await tx.stockReservation.create({
            data: {
              tenantId: job.tenantId,
              branchId: job.branchId,
              warehouseId: balance.warehouseId,
              stockBalanceId: balance.id,
              jobId: job.id,
              materialRequirementId: requirement.id,
              productId: requirement.productId,
              productVariantId: requirement.productVariantId,
              supplierProductId: requirement.supplierProductId,
              status: StockReservationStatus.RESERVED,
              reservedQuantity: reserveQuantity,
              unit: requirement.unit,
              reservedById: session.user.id,
              notes: `Reserved for ${job.jobNumber}.`,
            },
          });

          stillNeeded = stillNeeded.minus(reserveQuantity);
          reservationCount += 1;
        }

        const allocatedQuantity = this.money(requirement.allocatedQuantity).plus(remaining.minus(stillNeeded));
        if (allocatedQuantity.greaterThan(this.money(requirement.allocatedQuantity))) {
          await tx.materialRequirement.update({
            where: { id: requirement.id },
            data: {
              allocatedQuantity,
              status: allocatedQuantity.greaterThanOrEqualTo(this.money(requirement.requiredQuantity))
                ? MaterialRequirementStatus.ALLOCATED
                : MaterialRequirementStatus.PARTIALLY_ALLOCATED,
              updatedById: session.user.id,
            },
          });
        }
      }

      if (reservationCount === 0) {
        throw new BadRequestException("No available stock could be reserved for this job.");
      }

      return tx.job.findFirstOrThrow({ where: { id: job.id, tenantId: job.tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:stock:reserve",
      entityType: "job",
      entityId: job.id,
      newValues: { jobNumber: job.jobNumber },
    });

    return reserved;
  }

  async issueReservedStockForJob(session: TenantSession, jobId: string) {
    const job = await this.ensureJob(session, jobId, {
      include: {
        materialRequirements: {
          include: {
            stockReservations: {
              where: { status: { in: [StockReservationStatus.RESERVED, StockReservationStatus.PARTIALLY_ISSUED] } },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    const reservations = job.materialRequirements.flatMap((requirement: any) =>
      requirement.stockReservations.map((reservation: any) => ({ requirement, reservation })),
    );
    if (!reservations.length) {
      throw new BadRequestException("There is no reserved stock available to issue for this job.");
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      for (const { requirement, reservation } of reservations) {
        const remainingToIssue = this.money(reservation.reservedQuantity).minus(this.money(reservation.issuedQuantity));
        if (remainingToIssue.lessThanOrEqualTo(0)) continue;

        await tx.stockBalance.update({
          where: { id: reservation.stockBalanceId },
          data: {
            onHandQuantity: { decrement: remainingToIssue },
            reservedQuantity: { decrement: remainingToIssue },
            issuedQuantity: { increment: remainingToIssue },
          },
        });
        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: {
            issuedQuantity: { increment: remainingToIssue },
            status: StockReservationStatus.ISSUED,
            issuedById: session.user.id,
            issuedAt: new Date(),
          },
        });

        const issuedQuantity = this.money(requirement.issuedQuantity).plus(remainingToIssue);
        await tx.materialRequirement.update({
          where: { id: requirement.id },
          data: {
            issuedQuantity,
            status: issuedQuantity.greaterThanOrEqualTo(this.money(requirement.requiredQuantity))
              ? MaterialRequirementStatus.ISSUED
              : MaterialRequirementStatus.PARTIALLY_ISSUED,
            updatedById: session.user.id,
          },
        });
      }

      return tx.job.findFirstOrThrow({ where: { id: job.id, tenantId: job.tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:stock:issue",
      entityType: "job",
      entityId: job.id,
      newValues: { jobNumber: job.jobNumber },
    });

    return updated;
  }

  async scheduleJob(session: TenantSession, jobId: string, input: any) {
    const job = await this.ensureJob(session, jobId);
    if (input.scheduledEnd <= input.scheduledStart) {
      throw new BadRequestException("Scheduled end must be after scheduled start.");
    }

    const updated = await this.prisma.client.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.SCHEDULED,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        ...(input.accessNotes !== undefined ? { accessNotes: this.trimOrNull(input.accessNotes) } : {}),
        ...(input.workNotes !== undefined ? { workNotes: this.trimOrNull(input.workNotes) } : {}),
        updatedById: session.user.id,
      },
      include: JOB_INCLUDE,
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:schedule",
      entityType: "job",
      entityId: job.id,
      previousValues: { scheduledStart: job.scheduledStart, scheduledEnd: job.scheduledEnd },
      newValues: { scheduledStart: updated.scheduledStart, scheduledEnd: updated.scheduledEnd },
    });

    return updated;
  }

  async completeJob(session: TenantSession, jobId: string, input: any) {
    const job = await this.ensureJob(session, jobId);
    if (job.status === JobStatus.CANCELLED) {
      throw new BadRequestException("Cancelled jobs cannot be completed.");
    }

    const updated = await this.prisma.client.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: input.completedAt ?? new Date(),
        completedById: session.user.id,
        completionNotes: this.trimOrNull(input.completionNotes),
        customerSignoffName: this.trimOrNull(input.customerSignoffName),
        updatedById: session.user.id,
      },
      include: JOB_INCLUDE,
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:complete",
      entityType: "job",
      entityId: job.id,
      previousValues: { status: job.status },
      newValues: { status: updated.status, completedAt: updated.completedAt },
    });

    return updated;
  }

  async createInvoiceFromJob(session: TenantSession, jobId: string, input: any) {
    const job = await this.ensureJob(session, jobId, { include: { invoices: true } });
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException("Only completed jobs can be invoiced.");
    }

    const existingInvoice = job.invoices.find((invoice: any) => invoice.status !== InvoiceStatus.CANCELLED);
    if (existingInvoice) {
      return this.ensureJob(session, job.id, { include: JOB_INCLUDE });
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const invoiceNumber = await this.allocateNumber(tx, job.tenantId, "invoice", "INV");
      const total = this.money(job.totalValue);
      const paidAmount = Prisma.Decimal.min(this.money(job.depositPaid), total);
      const balanceDue = total.minus(paidAmount);
      const dueDate = input.dueDate ?? this.defaultDueDate();

      await tx.invoice.create({
        data: {
          tenantId: job.tenantId,
          branchId: job.branchId,
          jobId: job.id,
          customerId: job.customerId,
          siteId: job.siteId,
          invoiceNumber,
          status: balanceDue.lessThanOrEqualTo(0) ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
          currency: job.currency,
          subtotal: total,
          vatAmount: 0,
          total,
          paidAmount,
          balanceDue,
          issuedAt: new Date(),
          dueDate,
          notes: this.trimOrNull(input.notes),
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });

      return tx.job.findFirstOrThrow({ where: { id: job.id, tenantId: job.tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:invoice:create",
      entityType: "job",
      entityId: job.id,
      newValues: { jobNumber: job.jobNumber, invoiceCount: (updated.invoices ?? []).length },
    });

    return updated;
  }

  async recordInvoicePayment(session: TenantSession, invoiceId: string, input: any) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const invoice = await this.prisma.client.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
        job: this.branchAccess.branchWhere(session, tenantId),
      },
      include: { job: true },
    });
    if (!invoice) throw new NotFoundException("Resource not found.");
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException("Cancelled invoices cannot receive payments.");
    }
    if (invoice.status === InvoiceStatus.PAID || this.money(invoice.balanceDue).lessThanOrEqualTo(0)) {
      throw new BadRequestException("This invoice is already paid.");
    }

    const amount = this.money(input.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException("Payment amount must be greater than zero.");
    }
    if (amount.greaterThan(this.money(invoice.balanceDue))) {
      throw new BadRequestException("Payment amount cannot exceed the invoice balance.");
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const paymentNumber = await this.allocateNumber(tx, invoice.tenantId, "payment", "PAY");
      const paidAmount = this.money(invoice.paidAmount).plus(amount);
      const balanceDue = this.money(invoice.total).minus(paidAmount);

      await tx.payment.create({
        data: {
          tenantId: invoice.tenantId,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          paymentNumber,
          amount,
          currency: invoice.currency,
          method: this.trimOrNull(input.method),
          reference: this.trimOrNull(input.reference),
          paidAt: input.paidAt ?? new Date(),
          notes: this.trimOrNull(input.notes),
          createdById: session.user.id,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount,
          balanceDue,
          status: balanceDue.lessThanOrEqualTo(0) ? InvoiceStatus.PAID : InvoiceStatus.ISSUED,
          updatedById: session.user.id,
        },
      });

      return tx.job.findFirstOrThrow({ where: { id: invoice.jobId, tenantId: invoice.tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId: invoice.tenantId,
      actorUserId: session.user.id,
      action: "invoice:payment:record",
      entityType: "invoice",
      entityId: invoice.id,
      newValues: { amount: amount.toString(), invoiceNumber: invoice.invoiceNumber },
    });

    return updated;
  }

  private async ensureJob(session: TenantSession, jobId: string, args?: Omit<Prisma.JobFindFirstArgs, "where">): Promise<any> {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const job = await this.prisma.client.job.findFirst({
      where: { id: jobId, tenantId, ...this.branchAccess.branchWhere(session, tenantId) },
      ...(args ?? {}),
    });
    if (!job) throw new NotFoundException("Resource not found.");
    return job;
  }

  private async allocateNumber(tx: PrismaTransaction, tenantId: string, key: string, prefix: string) {
    const sql = Prisma.sql`
      INSERT INTO "NumberSequence" ("id", "tenantId", "key", "prefix", "nextValue", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${key}, ${prefix}, 2, 6, now(), now())
      ON CONFLICT ("tenantId", "key")
      DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1, "prefix" = EXCLUDED."prefix", "padding" = EXCLUDED."padding", "updatedAt" = now()
      RETURNING "prefix", "nextValue", "padding"
    `;
    const rows = await tx.$queryRaw<Array<{ prefix: string; nextValue: number; padding: number }>>(sql);
    const row = rows[0];
    if (!row) throw new BadRequestException("Unable to allocate job number.");
    return `${row.prefix}-${new Date().getUTCFullYear()}-${String(row.nextValue - 1).padStart(row.padding, "0")}`;
  }

  private async createMissingMaterialRequirementsTx(
    tx: PrismaTransaction,
    tenantId: string,
    job: { id: string; branchId: string | null; scheduledStart?: Date | null },
    quoteLines: Array<{
      id: string;
      sourceEstimateLineId: string | null;
      lineType: EstimateLineType;
      description: string;
      quantity: Prisma.Decimal;
      unit: string;
      notes: string | null;
      sourceEstimateLine: {
        id: string;
        productId: string | null;
        productVariantId: string | null;
        supplierProductId: string | null;
      } | null;
    }>,
    actorUserId: string,
  ) {
    const materialLines = quoteLines.filter((line) =>
      line.lineType === EstimateLineType.MATERIAL || line.lineType === EstimateLineType.ACCESSORY,
    );
    if (!materialLines.length) {
      return;
    }

    await tx.materialRequirement.createMany({
      skipDuplicates: true,
      data: materialLines.map((line) => ({
        tenantId,
        branchId: job.branchId,
        jobId: job.id,
        sourceQuoteLineId: line.id,
        sourceEstimateLineId: line.sourceEstimateLineId,
        productId: line.sourceEstimateLine?.productId ?? null,
        productVariantId: line.sourceEstimateLine?.productVariantId ?? null,
        supplierProductId: line.sourceEstimateLine?.supplierProductId ?? null,
        description: line.description,
        requiredQuantity: line.quantity,
        unit: line.unit,
        requiredDate: job.scheduledStart ?? null,
        notes: line.notes,
        createdById: actorUserId,
        updatedById: actorUserId,
      })),
    });
  }

  private async allocateProcurementNumber(
    tx: PrismaTransaction,
    tenantId: string,
    key: "purchase-requisition",
  ) {
    const sql = Prisma.sql`
      INSERT INTO "NumberSequence" ("id", "tenantId", "key", "prefix", "nextValue", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${key}, 'PR', 2, 6, now(), now())
      ON CONFLICT ("tenantId", "key")
      DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1, "updatedAt" = now()
      RETURNING "prefix", "nextValue", "padding"
    `;
    const rows = await tx.$queryRaw<Array<{ prefix: string; nextValue: number; padding: number }>>(sql);
    const row = rows[0];
    if (!row) throw new BadRequestException("Unable to allocate requisition number.");
    return `${row.prefix}-${new Date().getUTCFullYear()}-${String(row.nextValue - 1).padStart(row.padding, "0")}`;
  }

  private remainingRequirementQuantity(requirement: { requiredQuantity: Prisma.Decimal; requisitionedQuantity?: Prisma.Decimal | null }) {
    return this.money(requirement.requiredQuantity).minus(this.money(requirement.requisitionedQuantity ?? 0));
  }

  private remainingToAllocate(requirement: { requiredQuantity: Prisma.Decimal; allocatedQuantity?: Prisma.Decimal | null }) {
    return this.money(requirement.requiredQuantity).minus(this.money(requirement.allocatedQuantity ?? 0));
  }

  private money(value: number | string | Prisma.Decimal | null | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private defaultDueDate() {
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);
    return dueDate;
  }

  private trimOrNull(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
