export type ApiSuccess<T> = {
  data: T;
  meta: {
    requestId: string;
    [key: string]: unknown;
  };
  error: null;
};

export type ApiError = {
  data: null;
  meta: {
    requestId: string;
    [key: string]: unknown;
  };
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export type MembershipSummary = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "REVOKED";
  isOwner: boolean;
  roleKeys: string[];
  permissions: string[];
  defaultBranchId: string | null;
};

export type SessionContext = {
  sessionId: string;
  user: SessionUser;
  activeTenantId: string | null;
  activeBranchId: string | null;
  memberships: MembershipSummary[];
};
