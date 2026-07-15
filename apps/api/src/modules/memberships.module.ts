import { Controller, Get, Module, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../shared/auth.guard";
import { CurrentSession } from "../shared/session.decorator";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";

@Controller({ path: "memberships", version: "1" })
class MembershipsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@CurrentSession() session: { user: { id: string } }) {
    return this.prisma.client.tenantMembership.findMany({
      where: { userId: session.user.id },
      include: {
        tenant: true,
        roles: { include: { role: true } },
      },
    });
  }
}

@Controller({ path: "tenants", version: "1" })
class TenantMembershipsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get(":tenantId/memberships")
  @UseGuards(AuthGuard)
  async listByTenant(
    @Param("tenantId") tenantId: string,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    this.tenantAccess.ensureTenant(session, tenantId);
    return this.prisma.client.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}

@Module({
  controllers: [MembershipsController, TenantMembershipsController],
})
export class MembershipsModule {}
