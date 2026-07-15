import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { TenantAccessService } from "./tenant-access.service";

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

@Injectable()
export class BranchAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  branchWhere(
    session: TenantSession,
    tenantId?: string,
    field = "branchId",
  ): Record<string, unknown> {
    const scope = this.getScope(session, tenantId);
    if (!scope.restricted) {
      return {};
    }

    if (!scope.branchId) {
      return { [field]: { in: [] } };
    }

    return { [field]: scope.branchId };
  }

  async resolveCreateBranchId(
    session: TenantSession,
    requestedBranchId: string | undefined,
    tenantId?: string,
  ) {
    const scope = this.getScope(session, tenantId);

    if (requestedBranchId) {
      await this.ensureAuthorizedBranch(session, requestedBranchId, scope.tenantId);
      return requestedBranchId;
    }

    if (scope.restricted) {
      if (!scope.branchId) {
        throw new ForbiddenException("No authorised branch is available.");
      }

      return scope.branchId;
    }

    return scope.branchId ?? null;
  }

  async ensureAuthorizedBranch(
    session: TenantSession,
    branchId: string,
    tenantId?: string,
  ) {
    const scope = this.getScope(session, tenantId);
    const branch = await this.prisma.client.branch.findFirst({
      where: { id: branchId, tenantId: scope.tenantId },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException("Resource not found.");
    }

    if (scope.restricted && scope.branchId !== branchId) {
      throw new NotFoundException("Resource not found.");
    }

    return branch.id;
  }

  private getScope(session: TenantSession, tenantId?: string) {
    const { tenantId: resolvedTenantId, membership } =
      this.tenantAccess.ensureTenant(session, tenantId);
    const isTenantAdmin =
      membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER");

    return {
      tenantId: resolvedTenantId,
      restricted: !isTenantAdmin,
      branchId: session.activeBranchId ?? membership.defaultBranchId ?? null,
    };
  }
}
