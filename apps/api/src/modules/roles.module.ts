import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Put,
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

const roleAssignmentSchema = z.object({
  roleKeys: z.array(z.string().min(1)).min(1),
});

@Controller({ path: "roles", version: "1" })
class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(AuthGuard)
  list() {
    return this.prisma.client.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }
}

@Controller({ path: "memberships", version: "1" })
class MembershipRolesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly audit: AuditService,
  ) {}

  @Get(":membershipId/roles")
  @UseGuards(AuthGuard)
  async getRoles(
    @Param("membershipId") membershipId: string,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.membershipRole.findMany({
      where: {
        membershipId,
        membership: { tenantId },
      },
      include: { role: true },
    });
  }

  @Put(":membershipId/roles")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("roles.manage")
  async setRoles(
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = roleAssignmentSchema.parse(body);
    const membership =
      await this.prisma.client.tenantMembership.findFirstOrThrow({
        where: { id: membershipId, tenantId },
        include: { roles: { include: { role: true } } },
      });

    if (membership.isOwner && !input.roleKeys.includes("BUSINESS_OWNER")) {
      const ownerCount = await this.prisma.client.tenantMembership.count({
        where: { tenantId, isOwner: true, status: "ACTIVE" },
      });
      if (ownerCount <= 1) {
        throw new Error("Cannot remove the final active owner.");
      }
    }

    const roles = await this.prisma.client.role.findMany({
      where: { key: { in: input.roleKeys } },
    });

    await this.prisma.client.membershipRole.deleteMany({
      where: { membershipId },
    });
    await this.prisma.client.membershipRole.createMany({
      data: roles.map((role: { id: string }) => ({
        membershipId,
        roleId: role.id,
      })),
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "membership.roles.update",
      entityType: "tenant_membership",
      entityId: membershipId,
      previousValues: membership.roles.map(
        (item: (typeof membership.roles)[number]) => item.role.key,
      ),
      newValues: input.roleKeys,
    });

    return this.prisma.client.membershipRole.findMany({
      where: { membershipId },
      include: { role: true },
    });
  }
}

@Module({
  controllers: [RolesController, MembershipRolesController],
})
export class RolesModule {}
