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
import { CatalogueModule } from "./catalogue.module";
import { SuppliersModule } from "./suppliers.module";
import { SupplierPricingModule } from "./supplier-pricing.module";
import { ProcurementModule } from "./procurement.module";
import { EstimatesModule } from "./estimates.module";
import { QuotesModule } from "./quotes.module";
import { JobsModule } from "./jobs.module";
import { InventoryModule } from "./inventory.module";

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
    CatalogueModule,
    SuppliersModule,
    SupplierPricingModule,
    ProcurementModule,
    EstimatesModule,
    QuotesModule,
    JobsModule,
    InventoryModule,
  ],
  providers: [{ provide: "APP_URL", useValue: loadEnv().API_URL }],
})
export class AppModule {}
