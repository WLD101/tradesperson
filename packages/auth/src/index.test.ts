import { describe, expect, it } from "vitest";
import { hasPermission, safeTokenEquals } from "./index";

describe("auth helpers", () => {
  it("evaluates tenant-scoped permissions", () => {
    expect(
      hasPermission(
        {
          activeTenantId: "tenant-1",
          memberships: [
            {
              id: "membership-1",
              tenantId: "tenant-1",
              tenantName: "Tenant One",
              tenantSlug: "tenant-one",
              status: "ACTIVE",
              isOwner: true,
              roleKeys: ["BUSINESS_OWNER"],
              permissions: ["branches.manage"],
              defaultBranchId: null,
            },
          ],
        },
        "branches.manage",
      ),
    ).toBe(true);
  });

  it("allows business owners across tenant-scoped permissions", () => {
    expect(
      hasPermission(
        {
          activeTenantId: "tenant-1",
          memberships: [
            {
              id: "membership-1",
              tenantId: "tenant-1",
              tenantName: "Tenant One",
              tenantSlug: "tenant-one",
              status: "ACTIVE",
              isOwner: true,
              roleKeys: ["BUSINESS_OWNER"],
              permissions: [],
              defaultBranchId: null,
            },
          ],
        },
        "sites.view",
      ),
    ).toBe(true);
  });

  it("uses constant-time token comparison semantics", () => {
    expect(safeTokenEquals("abc123", "abc123")).toBe(true);
    expect(safeTokenEquals("abc123", "abc124")).toBe(false);
  });
});
