import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { SessionContext } from "@tradesperson/types";

const textEncoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "tp_session";

export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}

export const hashPassword = async (value: string) => bcrypt.hash(value, 12);
export const verifyPassword = async (value: string, hash: string) =>
  bcrypt.compare(value, hash);

export const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const safeTokenEquals = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
};

export type SessionTokenPayload = {
  sub: string;
  sid: string;
  tenantId: string | null;
  branchId: string | null;
  email: string;
};

export const signSessionToken = async (
  payload: SessionTokenPayload,
  secret: string,
  issuer: string,
  audience: string,
) =>
  new SignJWT({
    tenantId: payload.tenantId,
    branchId: payload.branchId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setJti(payload.sid)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(textEncoder.encode(secret));

export const verifySessionToken = async (
  token: string,
  secret: string,
  issuer: string,
  audience: string,
) => {
  const { payload } = await jwtVerify(token, textEncoder.encode(secret), {
    issuer,
    audience,
  });

  return {
    sub: payload.sub ?? "",
    sid: payload.jti ?? "",
    tenantId: typeof payload.tenantId === "string" ? payload.tenantId : null,
    branchId: typeof payload.branchId === "string" ? payload.branchId : null,
    email: typeof payload.email === "string" ? payload.email : "",
  } satisfies SessionTokenPayload;
};

export type PermissionEvaluatorInput = Pick<
  SessionContext,
  "activeTenantId" | "memberships"
>;

export const hasPermission = (
  session: PermissionEvaluatorInput,
  permission: string,
) => {
  if (!session.activeTenantId) {
    return false;
  }

  const membership = session.memberships.find(
    (item) =>
      item.tenantId === session.activeTenantId && item.status === "ACTIVE",
  );
  if (!membership) {
    return false;
  }

  if (membership.isOwner || membership.roleKeys.includes("BUSINESS_OWNER")) {
    return true;
  }

  return membership.permissions.includes(permission);
};
