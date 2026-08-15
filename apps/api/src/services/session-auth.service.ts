import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  SESSION_COOKIE_NAME,
  hashToken,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from "@tradesperson/auth";
import { loadEnv } from "../../../../packages/config/src";
import { flattenPermissions } from "../../../../packages/db/src";
import type { SessionContext } from "../../../../packages/types/src";
import type { Response } from "express";
import { PrismaService } from "./prisma.service";

@Injectable()
export class SessionAuthService {
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  async signIn(email: string, password: string, res: Response) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        memberships: {
          include: {
            tenant: true,
            roles: {
              include: {
                role: {
                  include: {
                    permissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !user ||
      !(await verifyPassword(password, user.passwordHash)) ||
      user.status !== "ACTIVE"
    ) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const activeMembership =
      user.memberships.find(
        (membership: (typeof user.memberships)[number]) =>
          membership.status === "ACTIVE",
      ) ?? null;
    const sessionHandle = randomUUID();
    const session = await this.prisma.client.authSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: hashToken(sessionHandle),
        activeTenantId: activeMembership?.tenantId ?? null,
        activeBranchId: activeMembership?.defaultBranchId ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const jwt = await signSessionToken(
      {
        sub: user.id,
        sid: sessionHandle,
        tenantId: session.activeTenantId,
        branchId: session.activeBranchId,
        email: user.email,
      },
      this.env.AUTH_SECRET,
      this.env.AUTH_ISSUER,
      this.env.AUTH_AUDIENCE,
    );

    this.writeCookie(res, jwt);
    return this.getSessionFromUser(user.id, session.id);
  }

  async getSessionFromCookie(
    cookieValue: string | undefined,
  ): Promise<SessionContext | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const payload = await verifySessionToken(
        cookieValue,
        this.env.AUTH_SECRET,
        this.env.AUTH_ISSUER,
        this.env.AUTH_AUDIENCE,
      );
      const session = await this.prisma.client.authSession.findFirst({
        where: {
          sessionTokenHash: hashToken(payload.sid),
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        return null;
      }

      return this.getSessionFromUser(payload.sub, session.id);
    } catch {
      return null;
    }
  }

  async logout(cookieValue: string | undefined, res: Response) {
    if (cookieValue) {
      try {
        const payload = await verifySessionToken(
          cookieValue,
          this.env.AUTH_SECRET,
          this.env.AUTH_ISSUER,
          this.env.AUTH_AUDIENCE,
        );
        await this.prisma.client.authSession.deleteMany({
          where: { sessionTokenHash: hashToken(payload.sid) },
        });
      } catch {
        // swallow invalid session during logout
      }
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { success: true };
  }

  async selectTenant(userId: string, tenantId: string, res: Response) {
    const membership = await this.prisma.client.tenantMembership.findFirst({
      where: { userId, tenantId, status: "ACTIVE" },
      include: { tenant: true },
    });

    if (!membership) {
      throw new UnauthorizedException("Tenant membership not found.");
    }

    const sessionHandle = randomUUID();
    await this.prisma.client.authSession.create({
      data: {
        userId,
        sessionTokenHash: hashToken(sessionHandle),
        activeTenantId: tenantId,
        activeBranchId: membership.defaultBranchId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const jwt = await signSessionToken(
      {
        sub: userId,
        sid: sessionHandle,
        tenantId,
        branchId: membership.defaultBranchId,
        email: "",
      },
      this.env.AUTH_SECRET,
      this.env.AUTH_ISSUER,
      this.env.AUTH_AUDIENCE,
    );

    this.writeCookie(res, jwt);
    return this.getSessionFromCookie(jwt);
  }

  private writeCookie(res: Response, value: string) {
    const cookieDomain =
      this.env.COOKIE_DOMAIN && this.env.COOKIE_DOMAIN !== "localhost"
        ? this.env.COOKIE_DOMAIN
        : undefined;

    res.cookie(SESSION_COOKIE_NAME, value, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.env.NODE_ENV === "production",
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
  }

  private async getSessionFromUser(
    userId: string,
    sessionId: string,
  ): Promise<SessionContext> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            tenant: true,
            roles: {
              include: {
                role: {
                  include: {
                    permissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
        sessions: {
          where: { id: sessionId },
        },
      },
    });

    const session = user.sessions[0];
    if (!session) {
      throw new UnauthorizedException("Session not found.");
    }

    return {
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
      activeTenantId: session.activeTenantId,
      activeBranchId: session.activeBranchId,
      memberships: user.memberships.map(
        (membership: (typeof user.memberships)[number]) => ({
          id: membership.id,
          tenantId: membership.tenantId,
          tenantName: membership.tenant.name,
          tenantSlug: membership.tenant.slug,
          status: membership.status,
          isOwner: membership.isOwner,
          roleKeys: membership.roles.map(
            (item: (typeof membership.roles)[number]) => item.role.key,
          ),
          permissions: flattenPermissions(
            membership.roles.map((item: (typeof membership.roles)[number]) => ({
              ...item.role,
              permissions: item.role.permissions,
            })),
          ),
          defaultBranchId: membership.defaultBranchId,
        }),
      ),
    };
  }
}
