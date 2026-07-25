import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  PurchaseOrderDeliveryPlanStatus,
  SupplierAcknowledgementStatus,
} from "@prisma/client/index";
import { z } from "zod";
import { ProcurementService } from "../services/procurement.service";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const requisitionLineSchema = z.object({
  productId: z.string().uuid(),
  productVariantId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  supplierProductId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  preferredSupplierId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  description: z.string().min(1).max(500),
  requestedQuantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(40),
  estimatedUnitCost: z.coerce.number().nonnegative().nullable().optional(),
  requiredDate: z.coerce.date().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
});

const createRequisitionSchema = z.object({
  branchId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  requiredDate: z.coerce.date().nullable().optional(),
  purpose: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  internalNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  lines: z.array(requisitionLineSchema).min(1),
});

const updateRequisitionSchema = createRequisitionSchema.partial();

const purchaseOrderLineSchema = z.object({
  purchaseRequisitionLineId: z.preprocess(
    emptyStringToNull,
    z.string().uuid().nullable(),
  ).optional(),
  productId: z.string().uuid(),
  productVariantId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  supplierProductId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  description: z.preprocess(emptyStringToNull, z.string().max(500).nullable()).optional(),
  quantity: z.coerce.number().positive(),
  unit: z.preprocess(emptyStringToNull, z.string().max(40).nullable()).optional(),
  unitCost: z.coerce.number().nonnegative().nullable().optional(),
  taxRate: z.coerce.number().min(0).max(1).nullable().optional(),
  requiredDate: z.coerce.date().nullable().optional(),
  expectedDate: z.coerce.date().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  overrideReason: z.preprocess(emptyStringToNull, z.string().max(500).nullable()).optional(),
});

const createPurchaseOrderSchema = z.object({
  branchId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  supplierId: z.string().uuid(),
  purchaseRequisitionId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  currency: z.preprocess(emptyStringToNull, z.string().max(3).nullable()).optional(),
  deliveryAmount: z.coerce.number().nonnegative().nullable().optional(),
  requiredDate: z.coerce.date().nullable().optional(),
  expectedDate: z.coerce.date().nullable().optional(),
  deliveryAddress: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  supplierReference: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  internalNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  terms: z.preprocess(emptyStringToNull, z.string().max(2000).nullable()).optional(),
  lines: z.array(purchaseOrderLineSchema).min(1),
});

const updatePurchaseOrderSchema = createPurchaseOrderSchema
  .omit({ supplierId: true, purchaseRequisitionId: true })
  .partial();

const deliveryPlanSchema = z.object({
  purchaseOrderVersionId: z.preprocess(
    emptyStringToNull,
    z.string().uuid().nullable(),
  ).optional(),
  expectedDate: z.coerce.date().nullable().optional(),
  deliveryAddress: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  status: z.nativeEnum(PurchaseOrderDeliveryPlanStatus).optional(),
  supplierReference: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(2000).nullable()).optional(),
});

const acknowledgementSchema = z.object({
  purchaseOrderVersionId: z.preprocess(
    emptyStringToNull,
    z.string().uuid().nullable(),
  ).optional(),
  status: z.nativeEnum(SupplierAcknowledgementStatus).optional(),
  supplierReference: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  acknowledgedAt: z.coerce.date().nullable().optional(),
  expectedDeliveryDate: z.coerce.date().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(2000).nullable()).optional(),
});

const goodsReceiptLineSchema = z.object({
  purchaseOrderLineId: z.string().uuid(),
  receivedQuantity: z.coerce.number().nonnegative(),
  damagedQuantity: z.coerce.number().nonnegative().nullable().optional(),
  rejectedQuantity: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
});

const createGoodsReceiptSchema = z.object({
  warehouseId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  supplierReference: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  idempotencyKey: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  receivedAt: z.coerce.date().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(2000).nullable()).optional(),
  lines: z.array(goodsReceiptLineSchema).min(1),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.string().trim().min(1).max(60).optional(),
  supplierId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
});

type TenantSession = Parameters<ProcurementService["listRequisitions"]>[0];

@Controller({ version: "1" })
class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get("purchase-requisitions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:read")
  listRequisitions(@Query() query: unknown, @CurrentSession() session: TenantSession) {
    return this.procurement.listRequisitions(session, listQuerySchema.parse(query));
  }

  @Post("purchase-requisitions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:create")
  createRequisition(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    return this.procurement.createRequisition(session, createRequisitionSchema.parse(body));
  }

  @Get("purchase-requisitions/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:read")
  getRequisition(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.getRequisition(session, id);
  }

  @Patch("purchase-requisitions/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:write")
  updateRequisition(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.updateRequisition(session, id, updateRequisitionSchema.parse(body));
  }

  @Post("purchase-requisitions/:id/submit")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:submit")
  submitRequisition(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.submitRequisition(session, id);
  }

  @Post("purchase-requisitions/:id/approve")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:approve")
  approveRequisition(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.approveRequisition(session, id);
  }

  @Post("purchase-requisitions/:id/reject")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:approve")
  rejectRequisition(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.rejectRequisition(session, id);
  }

  @Post("purchase-requisitions/:id/cancel")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:requisition:write")
  cancelRequisition(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.cancelRequisition(session, id);
  }

  @Post("purchase-requisitions/:id/create-purchase-order")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:create")
  createPurchaseOrderFromRequisition(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.createPurchaseOrderFromRequisition(
      session,
      id,
      createPurchaseOrderSchema.parse(body),
    );
  }

  @Get("purchase-orders")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:read")
  listPurchaseOrders(@Query() query: unknown, @CurrentSession() session: TenantSession) {
    return this.procurement.listPurchaseOrders(session, listQuerySchema.parse(query));
  }

  @Post("purchase-orders")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:create")
  createPurchaseOrder(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    return this.procurement.createPurchaseOrder(
      session,
      createPurchaseOrderSchema.parse(body),
    );
  }

  @Get("purchase-orders/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:read")
  getPurchaseOrder(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.getPurchaseOrder(session, id);
  }

  @Get("purchase-orders/:id/print")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:read")
  getPurchaseOrderPrint(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.getPurchaseOrderPrint(session, id);
  }

  @Patch("purchase-orders/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:write")
  updatePurchaseOrder(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.updatePurchaseOrder(
      session,
      id,
      updatePurchaseOrderSchema.parse(body),
    );
  }

  @Post("purchase-orders/:id/submit")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:submit")
  submitPurchaseOrder(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.submitPurchaseOrder(session, id);
  }

  @Post("purchase-orders/:id/approve")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:approve")
  approvePurchaseOrder(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.approvePurchaseOrder(session, id);
  }

  @Post("purchase-orders/:id/reject")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:approve")
  rejectPurchaseOrder(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.rejectPurchaseOrder(session, id);
  }

  @Post("purchase-orders/:id/issue")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:issue")
  issuePurchaseOrder(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.issuePurchaseOrder(session, id);
  }

  @Post("purchase-orders/:id/cancel")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:cancel")
  cancelPurchaseOrder(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.cancelPurchaseOrder(session, id);
  }

  @Post("purchase-orders/:id/new-version")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:write")
  createNewVersion(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.createNewVersion(session, id);
  }

  @Post("purchase-orders/:id/acknowledgements")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:acknowledgement:write")
  createAcknowledgement(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.createAcknowledgement(
      session,
      id,
      acknowledgementSchema.parse(body),
    );
  }

  @Patch("purchase-orders/:id/acknowledgements/:acknowledgementId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:acknowledgement:write")
  updateAcknowledgement(
    @Param("id") id: string,
    @Param("acknowledgementId") acknowledgementId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.updateAcknowledgement(
      session,
      id,
      acknowledgementId,
      acknowledgementSchema.parse(body),
    );
  }

  @Get("purchase-orders/:id/delivery-plans")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:order:read")
  listDeliveryPlans(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.listDeliveryPlans(session, id);
  }

  @Post("purchase-orders/:id/delivery-plans")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:delivery-plan:write")
  createDeliveryPlan(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.createDeliveryPlan(session, id, deliveryPlanSchema.parse(body));
  }

  @Patch("purchase-orders/:id/delivery-plans/:deliveryPlanId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:delivery-plan:write")
  updateDeliveryPlan(
    @Param("id") id: string,
    @Param("deliveryPlanId") deliveryPlanId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.updateDeliveryPlan(
      session,
      id,
      deliveryPlanId,
      deliveryPlanSchema.parse(body),
    );
  }

  @Get("purchase-orders/:id/goods-receipts")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:receipt:read")
  listGoodsReceipts(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.procurement.listGoodsReceipts(session, id);
  }

  @Post("purchase-orders/:id/goods-receipts")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:receipt:create")
  createGoodsReceipt(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.procurement.createGoodsReceipt(session, id, createGoodsReceiptSchema.parse(body));
  }

  @Get("goods-receipts/:receiptId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:receipt:read")
  getGoodsReceipt(@Param("receiptId") receiptId: string, @CurrentSession() session: TenantSession) {
    return this.procurement.getGoodsReceipt(session, receiptId);
  }

  @Post("goods-receipts/:receiptId/post")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("procurement:receipt:post")
  postGoodsReceipt(@Param("receiptId") receiptId: string, @CurrentSession() session: TenantSession) {
    return this.procurement.postGoodsReceipt(session, receiptId);
  }
}

@Module({
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}
