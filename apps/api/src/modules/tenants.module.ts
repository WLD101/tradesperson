import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { Response } from "express";
import { AuthGuard } from "../shared/auth.guard";
import { CurrentSession } from "../shared/session.decorator";
import { PrismaService } from "../services/prisma.service";
import { SessionAuthService } from "../services/session-auth.service";
import { AuditService } from "../services/audit.service";
import { TenantAccessService } from "../services/tenant-access.service";
import { BranchAccessService } from "../services/branch-access.service";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  legalName: z.string().optional(),
  tradingName: z.string().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  legalName: z.string().optional(),
  tradingName: z.string().optional(),
  companyNumber: z.string().optional(),
  vatRegistrationNo: z.string().optional(),
  businessEmail: z.string().email().optional(),
  businessPhone: z.string().optional(),
  website: z.string().url().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  countryCode: z.string().optional(),
  currencyCode: z.string().optional(),
  timeZone: z.string().optional(),
});

@Controller({ path: "tenants", version: "1" })
class TenantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SessionAuthService,
    private readonly audit: AuditService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@CurrentSession() session: { memberships: unknown[] }) {
    return session.memberships;
  }

  @Get("current")
  @UseGuards(AuthGuard)
  async current(
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
        branches: {
          where: this.branchAccess.branchWhere(session, tenantId, "id"),
          orderBy: { name: "asc" },
        },
        subscriptions: { where: { status: "ACTIVE" }, include: { plan: true } },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @Body() body: unknown,
    @CurrentSession() session: { user: { id: string } },
  ) {
    const input = createTenantSchema.parse(body);
    const tenant = await this.prisma.client.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        legalName: input.legalName ?? null,
        tradingName: input.tradingName ?? null,
        memberships: {
          create: {
            userId: session.user.id,
            status: "ACTIVE",
            isOwner: true,
          },
        },
        settings: {
          create: {},
        },
      },
    });

    await this.audit.record({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      action: "tenant.create",
      entityType: "tenant",
      entityId: tenant.id,
      newValues: input,
    });

    return tenant;
  }

  @Patch(":tenantId")
  @UseGuards(AuthGuard)
  async update(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    this.tenantAccess.ensureTenant(session, tenantId);
    const input = updateTenantSchema.parse(body);
    const previous = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    const updated = await this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.legalName !== undefined
          ? { legalName: input.legalName }
          : {}),
        ...(input.tradingName !== undefined
          ? { tradingName: input.tradingName }
          : {}),
        ...(input.companyNumber !== undefined
          ? { companyNumber: input.companyNumber }
          : {}),
        ...(input.vatRegistrationNo !== undefined
          ? { vatRegistrationNo: input.vatRegistrationNo }
          : {}),
        ...(input.businessEmail !== undefined
          ? { businessEmail: input.businessEmail }
          : {}),
        ...(input.businessPhone !== undefined
          ? { businessPhone: input.businessPhone }
          : {}),
        ...(input.website !== undefined ? { website: input.website } : {}),
        ...(input.addressLine1 !== undefined
          ? { addressLine1: input.addressLine1 }
          : {}),
        ...(input.addressLine2 !== undefined
          ? { addressLine2: input.addressLine2 }
          : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.postcode !== undefined ? { postcode: input.postcode } : {}),
        ...(input.countryCode !== undefined
          ? { countryCode: input.countryCode }
          : {}),
        ...(input.currencyCode !== undefined
          ? { currencyCode: input.currencyCode }
          : {}),
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "tenant.update",
      entityType: "tenant",
      entityId: tenantId,
      previousValues: previous,
      newValues: input,
    });

    return updated;
  }

  @Post(":tenantId/select")
  @UseGuards(AuthGuard)
  async select(
    @Param("tenantId") tenantId: string,
    @CurrentSession() session: { user: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const nextSession = await this.auth.selectTenant(
      session.user.id,
      tenantId,
      res,
    );
    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "tenant.select",
      entityType: "tenant",
      entityId: tenantId,
    });
    return nextSession;
  }
}

@Module({
  controllers: [TenantsController],
})
export class TenantsModule {}
