import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EstimateStatus, Prisma, QuoteStatus, QuoteVersionStatus } from "@prisma/client/index";
import { AuditService } from "./audit.service";
import { BranchAccessService } from "./branch-access.service";
import { PrismaService } from "./prisma.service";
import { TenantAccessService } from "./tenant-access.service";

type PrismaTransaction = Prisma.TransactionClient;
type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

const QUOTE_INCLUDE: any = {
  branch: { select: { id: true, name: true, branchCode: true } },
  customer: { select: { id: true, displayName: true, primaryEmail: true, primaryPhone: true } },
  site: { select: { id: true, label: true, addressLine1: true, city: true, postcode: true } },
  estimate: { select: { id: true, estimateNumber: true, status: true } },
  lines: { orderBy: [{ displayOrder: "asc" }] },
  versions: { orderBy: [{ versionNumber: "desc" }], take: 5 },
};

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly audit: AuditService,
  ) {}

  async listQuotes(session: TenantSession, query: any) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.QuoteWhereInput = {
      tenantId,
      ...this.branchAccess.branchWhere(session, tenantId),
      ...(query.status ? { status: query.status as QuoteStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { quoteNumber: { contains: query.search, mode: "insensitive" } },
              { title: { contains: query.search, mode: "insensitive" } },
              { customer: { displayName: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.quote.count({ where }),
      this.prisma.client.quote.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          branch: { select: { id: true, name: true } },
          customer: { select: { id: true, displayName: true } },
          site: { select: { id: true, label: true } },
          estimate: { select: { id: true, estimateNumber: true } },
          _count: { select: { lines: true, versions: true } },
        },
      }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async getQuote(session: TenantSession, quoteId: string) {
    return this.ensureQuote(session, quoteId, { include: QUOTE_INCLUDE });
  }

  async createFromEstimate(session: TenantSession, estimateId: string, input: any) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const estimate = await this.prisma.client.estimate.findFirst({
      where: { id: estimateId, tenantId, ...this.branchAccess.branchWhere(session, tenantId) },
      include: { lines: { orderBy: { displayOrder: "asc" } } },
    });
    if (!estimate) throw new NotFoundException("Resource not found.");
    if (
      estimate.status !== EstimateStatus.READY_FOR_QUOTE &&
      estimate.status !== EstimateStatus.QUOTED
    ) {
      throw new BadRequestException("Only estimates ready for quote can create quotes.");
    }
    if (!estimate.lines.length) throw new BadRequestException("Estimate has no lines to quote.");

    const quote = await this.prisma.client.$transaction(async (tx) => {
      const quoteNumber = await this.allocateNumber(tx, tenantId, "quote", "QUO");
      const created = await tx.quote.create({
        data: {
          tenantId,
          branchId: estimate.branchId,
          customerId: estimate.customerId,
          siteId: estimate.siteId,
          estimateId: estimate.id,
          quoteNumber,
          status: QuoteStatus.DRAFT,
          title: input.title?.trim() || `Quote for ${estimate.estimateNumber}`,
          currency: estimate.currency,
          subtotal: estimate.subtotal,
          discountAmount: estimate.discountAmount,
          vatRate: estimate.vatRate,
          vatAmount: estimate.vatAmount,
          grandTotal: estimate.grandTotal,
          depositRequired: this.money(input.depositRequired ?? this.money(estimate.grandTotal).mul("0.25")),
          validUntil: input.validUntil ?? null,
          terms: this.trimOrNull(input.terms),
          customerNotes: this.trimOrNull(input.customerNotes ?? estimate.customerNotes),
          internalNotes: this.trimOrNull(input.internalNotes),
          createdById: session.user.id,
          updatedById: session.user.id,
          lines: {
            create: estimate.lines.map((line, index) => ({
              tenantId,
              sourceEstimateLineId: line.id,
              lineType: line.lineType,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unitSellPrice: line.unitSellPrice,
              sellTotal: line.sellTotal,
              vatRate: line.vatRate,
              vatAmount: line.vatAmount,
              lineTotal: line.lineTotal,
              notes: line.notes,
              displayOrder: index,
            })),
          },
        },
        include: QUOTE_INCLUDE,
      });
      await tx.estimate.update({
        where: { id: estimate.id },
        data: { status: EstimateStatus.QUOTED, updatedById: session.user.id },
      });
      return created;
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "quote:create",
      entityType: "quote",
      entityId: quote.id,
      newValues: { quoteNumber: quote.quoteNumber, estimateId },
    });
    return quote;
  }

  async sendQuote(session: TenantSession, quoteId: string) {
    const quote = await this.ensureQuote(session, quoteId, { include: QUOTE_INCLUDE });
    if (quote.status !== QuoteStatus.DRAFT) throw new BadRequestException("Only draft quotes can be sent.");
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.quote.update({
        where: { id: quote.id },
        data: { status: QuoteStatus.SENT, sentAt: new Date(), sentById: session.user.id },
        include: QUOTE_INCLUDE,
      });
      await tx.quoteVersion.create({
        data: {
          tenantId: quote.tenantId,
          quoteId: quote.id,
          versionNumber: quote.versions.length + 1,
          status: QuoteVersionStatus.SENT,
          currency: updated.currency,
          subtotal: updated.subtotal,
          discountAmount: updated.discountAmount,
          vatRate: updated.vatRate,
          vatAmount: updated.vatAmount,
          grandTotal: updated.grandTotal,
          depositRequired: updated.depositRequired,
          snapshot: JSON.parse(JSON.stringify(updated)),
          createdById: session.user.id,
        },
      });
      return updated;
    });
  }

  async approveQuote(session: TenantSession, quoteId: string) {
    return this.transition(session, quoteId, QuoteStatus.APPROVED, "quote:approve");
  }

  async rejectQuote(session: TenantSession, quoteId: string) {
    return this.transition(session, quoteId, QuoteStatus.REJECTED, "quote:reject");
  }

  private async transition(session: TenantSession, quoteId: string, status: QuoteStatus, action: string) {
    const quote = await this.ensureQuote(session, quoteId);
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException("Only sent quotes can be approved or rejected.");
    }
    const updated = await this.prisma.client.quote.update({
      where: { id: quote.id },
      data: {
        status,
        ...(status === QuoteStatus.APPROVED ? { approvedAt: new Date(), approvedById: session.user.id } : {}),
        ...(status === QuoteStatus.REJECTED ? { rejectedAt: new Date(), rejectedById: session.user.id } : {}),
      },
      include: QUOTE_INCLUDE,
    });
    await this.audit.record({
      tenantId: quote.tenantId,
      actorUserId: session.user.id,
      action,
      entityType: "quote",
      entityId: quote.id,
      previousValues: { status: quote.status },
      newValues: { status },
    });
    return updated;
  }

  private async ensureQuote(session: TenantSession, quoteId: string, args?: Omit<Prisma.QuoteFindFirstArgs, "where">): Promise<any> {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const quote = await this.prisma.client.quote.findFirst({
      where: { id: quoteId, tenantId, ...this.branchAccess.branchWhere(session, tenantId) },
      ...(args ?? {}),
    });
    if (!quote) throw new NotFoundException("Resource not found.");
    return quote;
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
    if (!row) throw new BadRequestException("Unable to allocate quote number.");
    return `${row.prefix}-${new Date().getUTCFullYear()}-${String(row.nextValue - 1).padStart(row.padding, "0")}`;
  }

  private money(value: number | string | Prisma.Decimal | null | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private trimOrNull(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
