import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  EstimateLineType,
  InventoryMovementCondition,
  InventoryMovementType,
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
  quote: {
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      grandTotal: true,
      estimate: { select: { id: true, materialCost: true, labourCost: true, supplierCost: true } },
    },
  },
  assignedInstaller: { select: { id: true, firstName: true, lastName: true, email: true } },
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

type ReturnStockInput = {
  idempotencyKey?: string | null | undefined;
  notes?: string | null | undefined;
  lines: Array<{
    stockReservationId: string;
    usableQuantity?: number | undefined;
    damagedQuantity?: number | undefined;
    notes?: string | null | undefined;
  }>;
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

  async listSchedule(session: TenantSession, query: any) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    if (query.end <= query.start) {
      throw new BadRequestException("Schedule end must be after schedule start.");
    }
    const branchFilter = query.branchId
      ? { branchId: await this.branchAccess.ensureAuthorizedBranch(session, query.branchId, tenantId) }
      : this.branchAccess.branchWhere(session, tenantId);
    const searchWhere = query.search
      ? {
          OR: [
            { jobNumber: { contains: query.search, mode: "insensitive" as const } },
            { title: { contains: query.search, mode: "insensitive" as const } },
            { customer: { displayName: { contains: query.search, mode: "insensitive" as const } } },
            { site: { label: { contains: query.search, mode: "insensitive" as const } } },
            { site: { postcode: { contains: query.search, mode: "insensitive" as const } } },
          ],
        }
      : {};
    const statusWhere = query.status ? { status: query.status as JobStatus } : {};
    const installerWhere = query.installerId ? { assignedInstallerId: query.installerId } : {};
    const baseWhere: Prisma.JobWhereInput = {
      tenantId,
      ...branchFilter,
      ...searchWhere,
      ...statusWhere,
    };

    const [scheduledJobs, unscheduledJobs, installers] = await this.prisma.client.$transaction([
      this.prisma.client.job.findMany({
        where: {
          ...baseWhere,
          ...installerWhere,
          scheduledStart: { lt: query.end },
          scheduledEnd: { gt: query.start },
          status: query.status ? (query.status as JobStatus) : { notIn: [JobStatus.CANCELLED] },
        },
        orderBy: [{ scheduledStart: "asc" }, { jobNumber: "asc" }],
        take: 250,
        include: JOB_INCLUDE,
      }),
      this.prisma.client.job.findMany({
        where: {
          ...baseWhere,
          status: query.status
            ? (query.status as JobStatus)
            : { notIn: [JobStatus.COMPLETED, JobStatus.CANCELLED] },
          OR: [{ scheduledStart: null }, { scheduledEnd: null }, { assignedInstallerId: null }],
        },
        orderBy: [{ createdAt: "desc" }],
        take: query.unscheduledLimit ?? 25,
        include: JOB_INCLUDE,
      }),
      this.prisma.client.tenantMembership.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
          ...(query.branchId ? { OR: [{ defaultBranchId: query.branchId }, { defaultBranchId: null }, { isOwner: true }] } : {}),
        },
        orderBy: [{ createdAt: "asc" }],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
          defaultBranch: { select: { id: true, name: true, branchCode: true } },
          roles: { include: { role: { select: { key: true, name: true } } } },
        },
      }),
    ]);

    return {
      range: { start: query.start, end: query.end },
      installers: installers.map((membership) => ({
        id: membership.user.id,
        membershipId: membership.id,
        name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
        email: membership.user.email,
        status: membership.status,
        userStatus: membership.user.status,
        isOwner: membership.isOwner,
        defaultBranch: membership.defaultBranch,
        roleKeys: membership.roles.map((membershipRole) => membershipRole.role.key),
      })),
      scheduledJobs,
      unscheduledJobs,
      totalScheduled: scheduledJobs.length,
      totalUnscheduled: unscheduledJobs.length,
    };
  }

  async getJob(session: TenantSession, jobId: string) {
    const job = await this.ensureJob(session, jobId, { include: JOB_INCLUDE });
    return this.withProfitability(job);
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
    if ((input.scheduledStart && !input.scheduledEnd) || (!input.scheduledStart && input.scheduledEnd)) {
      throw new BadRequestException("Scheduled start and end must be provided together.");
    }
    if (input.scheduledStart && input.scheduledEnd && input.scheduledEnd <= input.scheduledStart) {
      throw new BadRequestException("Scheduled end must be after scheduled start.");
    }

    const assignedInstallerId = this.trimOrNull(input.assignedInstallerId);
    const installationTeamName = this.trimOrNull(input.installationTeamName);
    if (assignedInstallerId) {
      await this.ensureAssignableInstaller(tenantId, quote.branchId, assignedInstallerId);
    }
    if (input.scheduledStart && input.scheduledEnd) {
      await this.ensureScheduleAvailable({
        tenantId,
        branchId: quote.branchId,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        assignedInstallerId,
        installationTeamName,
      });
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
          assignedInstallerId,
          installationTeamName,
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
      newValues: { jobNumber: job.jobNumber, quoteId, assignedInstallerId, installationTeamName },
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
        const unitCost = await this.averageUnitCostForStockBalance(tx, job.tenantId, reservation.stockBalanceId);

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
        await tx.inventoryMovement.create({
          data: {
            tenantId: job.tenantId,
            branchId: job.branchId,
            warehouseId: reservation.warehouseId,
            stockBalanceId: reservation.stockBalanceId,
            productId: reservation.productId,
            productVariantId: reservation.productVariantId,
            supplierProductId: reservation.supplierProductId,
            jobId: job.id,
            materialRequirementId: requirement.id,
            type: InventoryMovementType.MATERIAL_ISSUE,
            condition: InventoryMovementCondition.USABLE,
            quantity: remainingToIssue,
            unit: reservation.unit,
            unitCost,
            value: remainingToIssue.times(unitCost),
            sourceType: "stock-reservation",
            sourceId: reservation.id,
            idempotencyKey: `${reservation.id}:issue`,
            notes: `Issued to ${job.jobNumber}.`,
            createdById: session.user.id,
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

  async returnJobStock(session: TenantSession, jobId: string, input: ReturnStockInput) {
    const job = await this.ensureJob(session, jobId);
    const idempotencyKey = this.trimOrNull(input.idempotencyKey);

    if (idempotencyKey) {
      const existingReturn = await this.prisma.client.inventoryMovement.findFirst({
        where: {
          tenantId: job.tenantId,
          jobId: job.id,
          type: InventoryMovementType.MATERIAL_RETURN,
          idempotencyKey: { startsWith: `${idempotencyKey}:` },
        },
      });
      if (existingReturn) {
        return this.ensureJob(session, job.id, { include: JOB_INCLUDE });
      }
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      for (const [index, line] of input.lines.entries()) {
        const usableQuantity = this.money(line.usableQuantity ?? 0);
        const damagedQuantity = this.money(line.damagedQuantity ?? 0);
        const totalQuantity = usableQuantity.plus(damagedQuantity);

        if (usableQuantity.lessThan(0) || damagedQuantity.lessThan(0)) {
          throw new BadRequestException("Return quantities cannot be negative.");
        }
        if (totalQuantity.lessThanOrEqualTo(0)) {
          throw new BadRequestException("Each return line must include usable or damaged quantity.");
        }

        const reservation = await tx.stockReservation.findFirst({
          where: {
            id: line.stockReservationId,
            tenantId: job.tenantId,
            jobId: job.id,
            status: { in: [StockReservationStatus.PARTIALLY_ISSUED, StockReservationStatus.ISSUED] },
          },
          include: { materialRequirement: true },
        });
        if (!reservation) {
          throw new NotFoundException("Resource not found.");
        }

        const priorReturns = await tx.inventoryMovement.findMany({
          where: {
            tenantId: job.tenantId,
            jobId: job.id,
            type: InventoryMovementType.MATERIAL_RETURN,
            sourceType: "stock-reservation",
            sourceId: reservation.id,
          },
          select: { quantity: true },
        });
        const alreadyReturned = priorReturns.reduce(
          (total, movement) => total.plus(movement.quantity),
          this.money(0),
        );
        const remainingReturnable = this.money(reservation.issuedQuantity).minus(alreadyReturned);
        if (totalQuantity.greaterThan(remainingReturnable)) {
          throw new BadRequestException("Return quantity cannot exceed the remaining issued quantity.");
        }
        const unitCost = await this.averageIssueUnitCostForReservation(tx, job.tenantId, job.id, reservation.id);

        if (usableQuantity.greaterThan(0)) {
          await tx.stockBalance.update({
            where: { id: reservation.stockBalanceId },
            data: {
              onHandQuantity: { increment: usableQuantity },
              issuedQuantity: { decrement: usableQuantity },
            },
          });
          await tx.inventoryMovement.create({
            data: {
              tenantId: job.tenantId,
              branchId: job.branchId,
              warehouseId: reservation.warehouseId,
              stockBalanceId: reservation.stockBalanceId,
              productId: reservation.productId,
              productVariantId: reservation.productVariantId,
              supplierProductId: reservation.supplierProductId,
              jobId: job.id,
              materialRequirementId: reservation.materialRequirementId,
              type: InventoryMovementType.MATERIAL_RETURN,
              condition: InventoryMovementCondition.USABLE,
              quantity: usableQuantity,
              unit: reservation.unit,
              unitCost,
              value: usableQuantity.times(unitCost),
              sourceType: "stock-reservation",
              sourceId: reservation.id,
              idempotencyKey: idempotencyKey ? `${idempotencyKey}:return:${index}:usable` : null,
              notes: this.trimOrNull(line.notes) ?? this.trimOrNull(input.notes),
              createdById: session.user.id,
            },
          });
        }

        if (damagedQuantity.greaterThan(0)) {
          await tx.stockBalance.update({
            where: { id: reservation.stockBalanceId },
            data: { issuedQuantity: { decrement: damagedQuantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              tenantId: job.tenantId,
              branchId: job.branchId,
              warehouseId: reservation.warehouseId,
              stockBalanceId: reservation.stockBalanceId,
              productId: reservation.productId,
              productVariantId: reservation.productVariantId,
              supplierProductId: reservation.supplierProductId,
              jobId: job.id,
              materialRequirementId: reservation.materialRequirementId,
              type: InventoryMovementType.MATERIAL_RETURN,
              condition: InventoryMovementCondition.DAMAGED,
              quantity: damagedQuantity,
              unit: reservation.unit,
              unitCost,
              value: damagedQuantity.times(unitCost),
              sourceType: "stock-reservation",
              sourceId: reservation.id,
              idempotencyKey: idempotencyKey ? `${idempotencyKey}:return:${index}:damaged` : null,
              notes: this.trimOrNull(line.notes) ?? this.trimOrNull(input.notes),
              createdById: session.user.id,
            },
          });
        }

        const issuedQuantity = this.money(reservation.materialRequirement.issuedQuantity).minus(totalQuantity);
        await tx.materialRequirement.update({
          where: { id: reservation.materialRequirementId },
          data: {
            issuedQuantity: Prisma.Decimal.max(issuedQuantity, this.money(0)),
            status: issuedQuantity.greaterThan(0)
              ? MaterialRequirementStatus.PARTIALLY_ISSUED
              : MaterialRequirementStatus.ALLOCATED,
            updatedById: session.user.id,
          },
        });
      }

      return tx.job.findFirstOrThrow({ where: { id: job.id, tenantId: job.tenantId }, include: JOB_INCLUDE });
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:stock:return",
      entityType: "job",
      entityId: job.id,
      newValues: { lineCount: input.lines.length },
    });

    return updated;
  }

  async scheduleJob(session: TenantSession, jobId: string, input: any) {
    const job = await this.ensureJob(session, jobId);
    if (input.scheduledEnd <= input.scheduledStart) {
      throw new BadRequestException("Scheduled end must be after scheduled start.");
    }
    const assignedInstallerId = this.trimOrNull(input.assignedInstallerId);
    const installationTeamName = this.trimOrNull(input.installationTeamName);
    if (assignedInstallerId) {
      await this.ensureAssignableInstaller(job.tenantId, job.branchId, assignedInstallerId);
    }
    await this.ensureScheduleAvailable({
      tenantId: job.tenantId,
      branchId: job.branchId,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      assignedInstallerId,
      installationTeamName,
      excludeJobId: job.id,
    });

    const updated = await this.prisma.client.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.SCHEDULED,
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd,
        assignedInstallerId,
        installationTeamName,
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
      previousValues: {
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
        assignedInstallerId: job.assignedInstallerId,
        installationTeamName: job.installationTeamName,
      },
      newValues: {
        scheduledStart: updated.scheduledStart,
        scheduledEnd: updated.scheduledEnd,
        assignedInstallerId: updated.assignedInstallerId,
        installationTeamName: updated.installationTeamName,
      },
    });

    return updated;
  }

  async unscheduleJob(session: TenantSession, jobId: string) {
    const job = await this.ensureJob(session, jobId);
    if (job.status === JobStatus.CANCELLED || job.status === JobStatus.COMPLETED) {
      throw new BadRequestException("Completed or cancelled jobs cannot be returned to the unscheduled queue.");
    }

    const updated = await this.prisma.client.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.DRAFT,
        scheduledStart: null,
        scheduledEnd: null,
        assignedInstallerId: null,
        installationTeamName: null,
        updatedById: session.user.id,
      },
      include: JOB_INCLUDE,
    });

    await this.audit.record({
      tenantId: job.tenantId,
      actorUserId: session.user.id,
      action: "job:unschedule",
      entityType: "job",
      entityId: job.id,
      previousValues: {
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
        assignedInstallerId: job.assignedInstallerId,
        installationTeamName: job.installationTeamName,
        status: job.status,
      },
      newValues: {
        scheduledStart: null,
        scheduledEnd: null,
        assignedInstallerId: null,
        installationTeamName: null,
        status: updated.status,
      },
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
    const job = await this.ensureJob(session, jobId, {
      include: {
        invoices: true,
        quote: { select: { subtotal: true, vatAmount: true, grandTotal: true } },
      },
    });
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException("Only completed jobs can be invoiced.");
    }

    const existingInvoice = job.invoices.find((invoice: any) => invoice.status !== InvoiceStatus.CANCELLED);
    if (existingInvoice) {
      return this.ensureJob(session, job.id, { include: JOB_INCLUDE });
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const invoiceNumber = await this.allocateNumber(tx, job.tenantId, "invoice", "INV");
      const subtotal = job.quote ? this.money(job.quote.subtotal) : this.money(job.totalValue);
      const vatAmount = job.quote ? this.money(job.quote.vatAmount) : this.money(0);
      const total = job.quote ? this.money(job.quote.grandTotal) : this.money(job.totalValue);
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
          status: this.invoiceStatusFor(paidAmount, balanceDue),
          currency: job.currency,
          subtotal,
          vatAmount,
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
    const idempotencyKey = this.trimOrNull(input.idempotencyKey);
    if (idempotencyKey) {
      const existingPayment = await this.prisma.client.payment.findFirst({
        where: { tenantId: invoice.tenantId, invoiceId: invoice.id, idempotencyKey },
      });
      if (existingPayment) {
        return this.ensureJob(session, invoice.jobId, { include: JOB_INCLUDE });
      }
    }
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
          idempotencyKey,
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
          status: this.invoiceStatusFor(paidAmount, balanceDue),
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

  async generateInvoicePdf(session: TenantSession, invoiceId: string) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const invoice = await this.prisma.client.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
        job: this.branchAccess.branchWhere(session, tenantId),
      },
      include: {
        tenant: { select: { name: true, businessEmail: true, businessPhone: true, addressLine1: true, city: true, postcode: true } },
        customer: { select: { displayName: true, companyName: true, primaryEmail: true, primaryPhone: true } },
        site: { select: { label: true, addressLine1: true, city: true, postcode: true } },
        job: { select: { jobNumber: true, title: true, workNotes: true } },
        payments: { orderBy: [{ paidAt: "asc" }] },
      },
    });
    if (!invoice) throw new NotFoundException("Resource not found.");

    const lines = [
      `${invoice.tenant.name}`,
      [invoice.tenant.addressLine1, invoice.tenant.city, invoice.tenant.postcode].filter(Boolean).join(", "),
      [invoice.tenant.businessEmail, invoice.tenant.businessPhone].filter(Boolean).join(" / "),
      "",
      `Invoice ${invoice.invoiceNumber}`,
      `Job ${invoice.job.jobNumber}${invoice.job.title ? ` - ${invoice.job.title}` : ""}`,
      `Issued ${invoice.issuedAt ? invoice.issuedAt.toISOString().slice(0, 10) : "-"}`,
      `Due ${invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "-"}`,
      "",
      "Bill to",
      invoice.customer.displayName,
      invoice.customer.companyName ?? "",
      [invoice.customer.primaryEmail, invoice.customer.primaryPhone].filter(Boolean).join(" / "),
      "",
      "Site",
      invoice.site.label,
      [invoice.site.addressLine1, invoice.site.city, invoice.site.postcode].filter(Boolean).join(", "),
      "",
      `Subtotal: ${invoice.currency} ${this.money(invoice.subtotal).toFixed(2)}`,
      `VAT: ${invoice.currency} ${this.money(invoice.vatAmount).toFixed(2)}`,
      `Total: ${invoice.currency} ${this.money(invoice.total).toFixed(2)}`,
      `Paid: ${invoice.currency} ${this.money(invoice.paidAmount).toFixed(2)}`,
      `Balance due: ${invoice.currency} ${this.money(invoice.balanceDue).toFixed(2)}`,
      "",
      invoice.payments.length ? "Payments" : "Payments: none recorded",
      ...invoice.payments.map((payment) =>
        `${payment.paymentNumber}  ${payment.paidAt.toISOString().slice(0, 10)}  ${payment.method ?? "-"}  ${invoice.currency} ${this.money(payment.amount).toFixed(2)}`,
      ),
      "",
      invoice.notes ? `Notes: ${invoice.notes}` : "",
    ].filter((line) => line !== null);

    return this.renderSimplePdf(lines);
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

  private renderSimplePdf(lines: string[]) {
    const escapePdfText = (value: string) =>
      value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const content = [
      "BT",
      "/F1 11 Tf",
      "50 790 Td",
      "14 TL",
      ...lines.flatMap((line, index) => [
        index === 0 ? "" : "T*",
        `(${escapePdfText(line)}) Tj`,
      ]).filter(Boolean),
      "ET",
    ].join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf, "utf8"));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, "utf8");
  }

  private async ensureAssignableInstaller(tenantId: string, branchId: string | null, installerId: string) {
    const membership = await this.prisma.client.tenantMembership.findFirst({
      where: {
        tenantId,
        userId: installerId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        isOwner: true,
        defaultBranchId: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    });
    if (!membership) {
      throw new BadRequestException("Assigned installer must be an active member of this tenant.");
    }

    const hasAllBranchAccess =
      membership.isOwner ||
      membership.roles.some((membershipRole) => membershipRole.role.key === "BUSINESS_OWNER");
    if (branchId && membership.defaultBranchId && membership.defaultBranchId !== branchId && !hasAllBranchAccess) {
      throw new BadRequestException("Assigned installer is not available for this branch.");
    }
  }

  private async ensureScheduleAvailable(input: {
    tenantId: string;
    branchId: string | null;
    scheduledStart: Date;
    scheduledEnd: Date;
    assignedInstallerId?: string | null;
    installationTeamName?: string | null;
    excludeJobId?: string;
  }) {
    const teamName = this.trimOrNull(input.installationTeamName);
    if (!input.assignedInstallerId && !teamName) {
      return;
    }

    const where: Prisma.JobWhereInput = {
      tenantId: input.tenantId,
      branchId: input.branchId,
      ...(input.excludeJobId ? { id: { not: input.excludeJobId } } : {}),
        status: { notIn: [JobStatus.CANCELLED, JobStatus.COMPLETED] },
        scheduledStart: { lt: input.scheduledEnd },
        scheduledEnd: { gt: input.scheduledStart },
        OR: [
          ...(input.assignedInstallerId ? [{ assignedInstallerId: input.assignedInstallerId }] : []),
          ...(teamName ? [{ installationTeamName: teamName }] : []),
        ],
    };

    const conflict = await this.prisma.client.job.findFirst({
      where,
      select: { jobNumber: true, scheduledStart: true, scheduledEnd: true },
    });

    if (conflict) {
      throw new BadRequestException(
        `Installation slot overlaps ${conflict.jobNumber}. Choose another installer, team, or time.`,
      );
    }
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

  private async withProfitability(job: any) {
    const movements = await this.prisma.client.inventoryMovement.findMany({
      where: {
        tenantId: job.tenantId,
        jobId: job.id,
        type: { in: [InventoryMovementType.MATERIAL_ISSUE, InventoryMovementType.MATERIAL_RETURN] },
      },
      select: { type: true, condition: true, value: true },
    });

    const issuedMaterialCost = movements
      .filter((movement) => movement.type === InventoryMovementType.MATERIAL_ISSUE)
      .reduce((total, movement) => total.plus(movement.value), this.money(0));
    const usableReturnCredit = movements
      .filter((movement) =>
        movement.type === InventoryMovementType.MATERIAL_RETURN &&
        movement.condition === InventoryMovementCondition.USABLE,
      )
      .reduce((total, movement) => total.plus(movement.value), this.money(0));
    const actualMaterialCost = Prisma.Decimal.max(issuedMaterialCost.minus(usableReturnCredit), this.money(0));
    const estimatedMaterialCost = this.money(job.quote?.estimate?.materialCost ?? 0);
    const labourCost = this.money(job.quote?.estimate?.labourCost ?? 0);
    const totalCost = actualMaterialCost.greaterThan(0)
      ? actualMaterialCost.plus(labourCost)
      : estimatedMaterialCost.plus(labourCost);
    const revenue = this.money(job.totalValue);
    const grossProfit = revenue.minus(totalCost);
    const grossMarginPercent = revenue.equals(0) ? this.money(0) : grossProfit.div(revenue).mul(100);
    const invoicedTotal = (job.invoices ?? [])
      .filter((invoice: any) => invoice.status !== InvoiceStatus.CANCELLED)
      .reduce((total: Prisma.Decimal, invoice: any) => total.plus(invoice.total), this.money(0));
    const paidAmount = (job.invoices ?? [])
      .filter((invoice: any) => invoice.status !== InvoiceStatus.CANCELLED)
      .reduce((total: Prisma.Decimal, invoice: any) => total.plus(invoice.paidAmount), this.money(0));
    const balanceDue = (job.invoices ?? [])
      .filter((invoice: any) => invoice.status !== InvoiceStatus.CANCELLED)
      .reduce((total: Prisma.Decimal, invoice: any) => total.plus(invoice.balanceDue), this.money(0));

    return {
      ...job,
      profitability: {
        revenue,
        invoicedTotal,
        paidAmount,
        balanceDue,
        estimatedMaterialCost,
        actualMaterialCost,
        labourCost,
        totalCost,
        grossProfit,
        grossMarginPercent,
      },
    };
  }

  private async averageUnitCostForStockBalance(tx: PrismaTransaction, tenantId: string, stockBalanceId: string) {
    const receipts = await tx.inventoryMovement.findMany({
      where: {
        tenantId,
        stockBalanceId,
        type: { in: [InventoryMovementType.GOODS_RECEIPT, InventoryMovementType.ADJUSTMENT] },
        condition: InventoryMovementCondition.USABLE,
      },
      select: { quantity: true, value: true, unitCost: true },
    });
    const quantity = receipts.reduce((total, movement) => total.plus(movement.quantity), this.money(0));
    const value = receipts.reduce((total, movement) => total.plus(movement.value), this.money(0));
    if (quantity.greaterThan(0) && value.greaterThanOrEqualTo(0)) {
      return value.div(quantity);
    }
    return receipts[0]?.unitCost ?? this.money(0);
  }

  private async averageIssueUnitCostForReservation(
    tx: PrismaTransaction,
    tenantId: string,
    jobId: string,
    reservationId: string,
  ) {
    const issues = await tx.inventoryMovement.findMany({
      where: {
        tenantId,
        jobId,
        type: InventoryMovementType.MATERIAL_ISSUE,
        sourceType: "stock-reservation",
        sourceId: reservationId,
      },
      select: { quantity: true, value: true, unitCost: true },
    });
    const quantity = issues.reduce((total, movement) => total.plus(movement.quantity), this.money(0));
    const value = issues.reduce((total, movement) => total.plus(movement.value), this.money(0));
    if (quantity.greaterThan(0) && value.greaterThanOrEqualTo(0)) {
      return value.div(quantity);
    }
    return issues[0]?.unitCost ?? this.money(0);
  }

  private money(value: number | string | Prisma.Decimal | null | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private defaultDueDate() {
    const dueDate = new Date();
    dueDate.setUTCDate(dueDate.getUTCDate() + 14);
    return dueDate;
  }

  private invoiceStatusFor(paidAmount: Prisma.Decimal, balanceDue: Prisma.Decimal) {
    if (balanceDue.lessThanOrEqualTo(0)) return InvoiceStatus.PAID;
    if (paidAmount.greaterThan(0)) return InvoiceStatus.PARTIALLY_PAID;
    return InvoiceStatus.ISSUED;
  }

  private trimOrNull(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
