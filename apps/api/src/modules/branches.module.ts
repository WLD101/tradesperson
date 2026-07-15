import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { AuditService } from "../services/audit.service";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";
import { BranchAccessService } from "../services/branch-access.service";

const branchSchema = z.object({
  name: z.string().min(2),
  branchCode: z.string().min(2),
  type: z.enum([
    "HEAD_OFFICE",
    "SHOWROOM",
    "WAREHOUSE",
    "OFFICE",
    "STORAGE",
    "MOBILE_TEAM",
    "OTHER",
  ]),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  countryCode: z.string().optional(),
  timeZone: z.string().optional(),
  isDefault: z.boolean().optional(),
  businessHours: z.unknown().optional(),
});

@Controller({ path: "branches", version: "1" })
class BranchesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly audit: AuditService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.branch.findMany({
      where: {
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId, "id"),
      },
      orderBy: { name: "asc" },
    });
  }

  @Get(":branchId")
  @UseGuards(AuthGuard)
  async get(
    @Param("branchId") branchId: string,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    await this.branchAccess.ensureAuthorizedBranch(session, branchId, tenantId);
    return this.prisma.client.branch.findFirstOrThrow({
      where: { id: branchId, tenantId },
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("branches.manage")
  async create(
    @Body() body: unknown,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = branchSchema.parse(body);
    const branch = await this.prisma.client.branch.create({
      data: {
        tenantId,
        name: input.name,
        branchCode: input.branchCode,
        type: input.type,
        status: input.status ?? "ACTIVE",
        email: input.email || null,
        phone: input.phone ?? null,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        postcode: input.postcode ?? null,
        countryCode: input.countryCode ?? "GB",
        timeZone: input.timeZone ?? null,
        isDefault: input.isDefault ?? false,
        ...(input.businessHours !== undefined
          ? { businessHours: input.businessHours as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "branch.create",
      entityType: "branch",
      entityId: branch.id,
      newValues: input,
    });

    return branch;
  }

  @Patch(":branchId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("branches.manage")
  async update(
    @Param("branchId") branchId: string,
    @Body() body: unknown,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = branchSchema.partial().parse(body);
    const previous = await this.prisma.client.branch.findFirstOrThrow({
      where: { id: branchId, tenantId },
    });
    const branch = await this.prisma.client.branch.update({
      where: { id: branchId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.branchCode !== undefined
          ? { branchCode: input.branchCode }
          : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.email !== undefined
          ? { email: input.email === "" ? null : input.email }
          : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
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
        ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
        ...(input.isDefault !== undefined
          ? { isDefault: input.isDefault }
          : {}),
        ...(input.businessHours !== undefined
          ? { businessHours: input.businessHours as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "branch.update",
      entityType: "branch",
      entityId: branch.id,
      previousValues: previous,
      newValues: input,
    });

    return branch;
  }
}

@Module({
  controllers: [BranchesController],
})
export class BranchesModule {}
