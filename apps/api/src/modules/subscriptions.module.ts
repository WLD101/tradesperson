import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../shared/auth.guard";
import { CurrentSession } from "../shared/session.decorator";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";

@Controller({ path: "subscriptions", version: "1" })
class SubscriptionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get("current")
  @UseGuards(AuthGuard)
  async current(
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.tenantSubscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      include: { plan: true },
    });
  }
}

@Module({
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
