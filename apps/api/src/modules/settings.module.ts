import {
  Body,
  Controller,
  Get,
  Module,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { AuditService } from "../services/audit.service";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";

const settingsSchema = z.object({
  defaultVatBehavior: z.string().optional(),
  quoteNumberPrefix: z.string().optional(),
  invoiceNumberPrefix: z.string().optional(),
  jobNumberPrefix: z.string().optional(),
});

@Controller({ path: "settings", version: "1" })
class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async get(
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.tenantSetting.findUnique({ where: { tenantId } });
  }

  @Patch()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("settings.manage")
  async update(
    @Body() body: unknown,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = settingsSchema.parse(body);
    const previous = await this.prisma.client.tenantSetting.findUnique({
      where: { tenantId },
    });
    const updated = await this.prisma.client.tenantSetting.upsert({
      where: { tenantId },
      update: {
        ...(input.defaultVatBehavior !== undefined
          ? { defaultVatBehavior: input.defaultVatBehavior }
          : {}),
        ...(input.quoteNumberPrefix !== undefined
          ? { quoteNumberPrefix: input.quoteNumberPrefix }
          : {}),
        ...(input.invoiceNumberPrefix !== undefined
          ? { invoiceNumberPrefix: input.invoiceNumberPrefix }
          : {}),
        ...(input.jobNumberPrefix !== undefined
          ? { jobNumberPrefix: input.jobNumberPrefix }
          : {}),
      },
      create: {
        tenantId,
        defaultVatBehavior: input.defaultVatBehavior ?? "STANDARD",
        quoteNumberPrefix: input.quoteNumberPrefix ?? "Q",
        invoiceNumberPrefix: input.invoiceNumberPrefix ?? "INV",
        jobNumberPrefix: input.jobNumberPrefix ?? "JOB",
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "settings.update",
      entityType: "tenant_setting",
      entityId: updated.id,
      previousValues: previous,
      newValues: input,
    });

    return updated;
  }
}

@Module({
  controllers: [SettingsController],
})
export class SettingsModule {}
