import { describe, expect, it } from "vitest";
import { TenantAccessService } from "./tenant-access.service";

describe("TenantAccessService", () => {
  it("returns the resolved tenant when membership is active", () => {
    const service = new TenantAccessService();
    const result = service.ensureTenant({
      sessionId: "session",
      user: {
        id: "user",
        email: "user@example.com",
        firstName: "User",
        lastName: "Example",
        status: "ACTIVE",
      },
      activeTenantId: "tenant-a",
      activeBranchId: null,
      memberships: [
        {
          id: "membership-a",
          tenantId: "tenant-a",
          tenantName: "Tenant A",
          tenantSlug: "tenant-a",
          status: "ACTIVE",
          isOwner: true,
          roleKeys: [],
          permissions: [],
          defaultBranchId: null,
        },
      ],
    });

    expect(result.tenantId).toBe("tenant-a");
  });

  it("throws when the tenant is not accessible", () => {
    const service = new TenantAccessService();
    expect(() =>
      service.ensureTenant({
        sessionId: "session",
        user: {
          id: "user",
          email: "user@example.com",
          firstName: "User",
          lastName: "Example",
          status: "ACTIVE",
        },
        activeTenantId: null,
        activeBranchId: null,
        memberships: [],
      }),
    ).toThrow();
  });
});
