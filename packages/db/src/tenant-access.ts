import type { TenantMembership } from "@prisma/client";

export const ensureActiveMembership = (
  membership: TenantMembership | null | undefined,
) => {
  if (!membership || membership.status !== "ACTIVE") {
    throw new Error("Active tenant membership is required.");
  }

  return membership;
};
