import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EstimateLineType, JobStatus, Prisma, QuoteStatus } from "@prisma/client/index";
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
  materialRequirements: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      product: { select: { id: true, name: true, sku: true } },
      productVariant: { select: { id: true, name: true, sku: true } },
      supplierProduct: { select: { id: true, supplierSku: true, supplierDescription: true } },
      sourceQuoteLine: { select: { id: true, description: true, quantity: true, unit: true } },
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

  private trimOrNull(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
