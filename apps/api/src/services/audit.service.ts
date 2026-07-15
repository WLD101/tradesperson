import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { requestContext } from "../shared/request-context";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    tenantId?: string | null;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    previousValues?: unknown;
    newValues?: unknown;
    source?: string;
  }) {
    const context = requestContext.get();

    return this.prisma.client.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        requestId: context?.requestId ?? null,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        source: input.source ?? "api",
        previousValues: this.sanitize(input.previousValues),
        newValues: this.sanitize(input.newValues),
      },
    });
  }

  sanitize(payload: unknown) {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    return JSON.parse(
      JSON.stringify(payload, (key, value: unknown) => {
        const lowered = key.toLowerCase();
        if (
          lowered.includes("password") ||
          lowered.includes("token") ||
          lowered.includes("secret")
        ) {
          return "[REDACTED]";
        }
        return value;
      }),
    );
  }
}
