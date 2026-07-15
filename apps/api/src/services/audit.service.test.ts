import { describe, expect, it } from "vitest";
import { AuditService } from "./audit.service";

describe("AuditService", () => {
  it("redacts sensitive values", () => {
    const service = new AuditService({
      client: { auditLog: { create: async () => ({}) } },
    } as never);
    const sanitized = service.sanitize({
      password: "secret",
      nestedToken: "abc",
      safe: "value",
    }) as Record<string, string>;

    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.nestedToken).toBe("[REDACTED]");
    expect(sanitized.safe).toBe("value");
  });
});
