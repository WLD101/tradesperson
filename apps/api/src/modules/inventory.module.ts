import { Controller, Get, Module, Post, UseGuards } from "@nestjs/common";
import { InventoryService } from "../services/inventory.service";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";

type TenantSession = Parameters<InventoryService["reconcileStockBalances"]>[0];

@Controller({ version: "1" })
class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("inventory/reconciliation")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("inventory:read")
  getReconciliation(@CurrentSession() session: TenantSession) {
    return this.inventory.reconcileStockBalances(session);
  }

  @Post("inventory/reconciliation/apply")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("inventory:reconcile")
  applyReconciliation(@CurrentSession() session: TenantSession) {
    return this.inventory.reconcileStockBalances(session, { apply: true });
  }
}

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
