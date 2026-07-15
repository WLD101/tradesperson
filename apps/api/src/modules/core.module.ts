import { Global, Module } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";
import { SessionAuthService } from "../services/session-auth.service";
import { TenantAccessService } from "../services/tenant-access.service";
import { AuthorizationService } from "../services/authorization.service";
import { AuditService } from "../services/audit.service";
import { RedisService } from "../services/redis.service";
import { QueueService } from "../services/queue.service";
import { BranchAccessService } from "../services/branch-access.service";

@Global()
@Module({
  providers: [
    PrismaService,
    SessionAuthService,
    TenantAccessService,
    AuthorizationService,
    AuditService,
    BranchAccessService,
    RedisService,
    QueueService,
  ],
  exports: [
    PrismaService,
    SessionAuthService,
    TenantAccessService,
    AuthorizationService,
    AuditService,
    BranchAccessService,
    RedisService,
    QueueService,
  ],
})
export class CoreModule {}
