import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";

@Controller({ path: "audit-logs", version: "1" })
class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("audit.view")
  async list(
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}

@Module({
  controllers: [AuditController],
})
export class AuditModule {}
