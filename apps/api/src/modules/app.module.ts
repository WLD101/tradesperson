import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { loadEnv } from "../../../../packages/config/src";
import { HealthModule } from "./health.module";
import { AuthModule } from "./auth.module";
import { UsersModule } from "./users.module";
import { TenantsModule } from "./tenants.module";
import { MembershipsModule } from "./memberships.module";
import { RolesModule } from "./roles.module";
import { PermissionsModule } from "./permissions.module";
import { BranchesModule } from "./branches.module";
import { AuditModule } from "./audit.module";
import { SettingsModule } from "./settings.module";
import { InvitationsModule } from "./invitations.module";
import { SubscriptionsModule } from "./subscriptions.module";
import { CoreModule } from "./core.module";
import { CrmModule } from "./crm.module";
import { SurveysModule } from "./surveys.module";

const env = loadEnv();

@Module({
  imports: [
    CoreModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    MembershipsModule,
    RolesModule,
    PermissionsModule,
    BranchesModule,
    AuditModule,
    SettingsModule,
    InvitationsModule,
    SubscriptionsModule,
    CrmModule,
    SurveysModule,
  ],
  providers: [{ provide: "APP_URL", useValue: env.API_URL }],
})
export class AppModule {}
