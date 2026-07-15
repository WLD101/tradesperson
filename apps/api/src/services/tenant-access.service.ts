import { ForbiddenException, Injectable } from "@nestjs/common";
import type { SessionContext } from "../../../../packages/types/src";

@Injectable()
export class TenantAccessService {
  ensureTenant(session: SessionContext, tenantId?: string) {
    const resolvedTenantId = tenantId ?? session.activeTenantId;
    if (!resolvedTenantId) {
      throw new ForbiddenException("No active tenant selected.");
    }

    const membership = session.memberships.find(
      (item) => item.tenantId === resolvedTenantId && item.status === "ACTIVE",
    );
    if (!membership) {
      throw new ForbiddenException("Tenant access denied.");
    }

    return {
      tenantId: resolvedTenantId,
      membership,
    };
  }
}
