import { randomUUID } from "node:crypto";
import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { hashPassword, hashToken } from "../../../../packages/auth/src";
import { loadEnv } from "../../../../packages/config/src";
import { z } from "zod";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { AuditService } from "../services/audit.service";
import { PrismaService } from "../services/prisma.service";
import { QueueService } from "../services/queue.service";
import { TenantAccessService } from "../services/tenant-access.service";
import { requestContext } from "../shared/request-context";

const invitationSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roleKey: z.string().min(1),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(12),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

@Controller({ path: "tenants", version: "1" })
class TenantInvitationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
  ) {}

  @Post(":tenantId/invitations")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("users.invite")
  async invite(
    @Param("tenantId") tenantId: string,
    @Body() body: unknown,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    this.tenantAccess.ensureTenant(session, tenantId);
    const input = invitationSchema.parse(body);
    const rawToken = `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
    const invitation = await this.prisma.client.invitation.create({
      data: {
        tenantId,
        email: input.email.toLowerCase(),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        roleKey: input.roleKey,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdById: session.user.id,
      },
    });

    await this.queue.emailQueue.add("send-invitation", {
      tenantId,
      correlationId: requestContext.get()?.requestId ?? randomUUID(),
      recipient: invitation.email,
      template: "tenant-invitation",
      templateData: {
        inviteUrl: `${loadEnv().WEB_URL}/invitations/${rawToken}`,
        firstName: input.firstName ?? "",
        tenantId,
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "invitation.create",
      entityType: "invitation",
      entityId: invitation.id,
      newValues: { email: invitation.email },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      roleKey: invitation.roleKey,
    };
  }

  @Get(":tenantId/invitations")
  @UseGuards(AuthGuard)
  async list(
    @Param("tenantId") tenantId: string,
    @CurrentSession()
    session: Parameters<TenantAccessService["ensureTenant"]>[0],
  ) {
    this.tenantAccess.ensureTenant(session, tenantId);
    return this.prisma.client.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }
}

@Controller({ path: "invitations", version: "1" })
class InvitationAcceptanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":token")
  async getByToken(@Param("token") token: string) {
    const invitation = await this.prisma.client.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { tenant: true },
    });

    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.expiresAt <= new Date()
    ) {
      return { valid: false };
    }

    return {
      valid: true,
      email: invitation.email,
      tenantName: invitation.tenant.name,
      expiresAt: invitation.expiresAt,
    };
  }

  @Post("accept")
  async accept(@Body() body: unknown) {
    const input = acceptInvitationSchema.parse(body);
    const invitation = await this.prisma.client.invitation.findUniqueOrThrow({
      where: { tokenHash: hashToken(input.token) },
    });

    if (invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
      throw new Error("Invitation is no longer valid.");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.client.user.upsert({
      where: { email: invitation.email },
      update: {
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        status: "ACTIVE",
      },
      create: {
        email: invitation.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      },
    });

    await this.prisma.client.tenantMembership.upsert({
      where: {
        tenantId_userId: { tenantId: invitation.tenantId, userId: user.id },
      },
      update: { status: "ACTIVE" },
      create: {
        tenantId: invitation.tenantId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    const membership =
      await this.prisma.client.tenantMembership.findUniqueOrThrow({
        where: {
          tenantId_userId: { tenantId: invitation.tenantId, userId: user.id },
        },
      });

    if (invitation.roleKey) {
      const role = await this.prisma.client.role.findUnique({
        where: { key: invitation.roleKey },
      });
      if (role) {
        await this.prisma.client.membershipRole.upsert({
          where: {
            membershipId_roleId: {
              membershipId: membership.id,
              roleId: role.id,
            },
          },
          update: {},
          create: { membershipId: membership.id, roleId: role.id },
        });
      }
    }

    await this.prisma.client.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return { success: true, email: invitation.email };
  }
}

@Module({
  controllers: [TenantInvitationsController, InvitationAcceptanceController],
})
export class InvitationsModule {}
