import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { EstimateLineType } from "@prisma/client/index";
import { z } from "zod";
import { EstimatesService } from "../services/estimates.service";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const roomSchema = z.object({
  surveyRoomId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  roomName: z.string().min(1).max(255),
  grossArea: z.coerce.number().nonnegative().nullable().optional(),
  deductionArea: z.coerce.number().nonnegative().nullable().optional(),
  netArea: z.coerce.number().nonnegative(),
  wastePercent: z.coerce.number().min(0).max(100).nullable().optional(),
  perimeter: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
});

const lineSchema = z.object({
  estimateRoomId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  lineType: z.nativeEnum(EstimateLineType).optional(),
  productId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  productVariantId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  supplierProductId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  description: z.string().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unit: z.preprocess(emptyStringToNull, z.string().max(40).nullable()).optional(),
  unitCost: z.coerce.number().nonnegative().nullable().optional(),
  unitSellPrice: z.coerce.number().nonnegative().nullable().optional(),
  vatRate: z.coerce.number().min(0).max(1).nullable().optional(),
  overrideReason: z.preprocess(emptyStringToNull, z.string().max(500).nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
});

const createEstimateSchema = z.object({
  branchId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  customerId: z.string().uuid(),
  siteId: z.string().uuid(),
  surveyId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  title: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
  currency: z.preprocess(emptyStringToNull, z.string().max(3).nullable()).optional(),
  vatRate: z.coerce.number().min(0).max(1).nullable().optional(),
  internalNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  customerNotes: z.preprocess(emptyStringToNull, z.string().max(4000).nullable()).optional(),
  importSurveyRooms: z.coerce.boolean().optional(),
  rooms: z.array(roomSchema).optional(),
  lines: z.array(lineSchema).optional(),
});

const updateEstimateSchema = createEstimateSchema
  .omit({ customerId: true, siteId: true, surveyId: true, branchId: true, importSurveyRooms: true })
  .partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.string().trim().min(1).max(60).optional(),
  customerId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
});

type TenantSession = Parameters<EstimatesService["listEstimates"]>[0];

@Controller({ version: "1" })
class EstimatesController {
  constructor(private readonly estimates: EstimatesService) {}

  @Get("estimates")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:read")
  listEstimates(@Query() query: unknown, @CurrentSession() session: TenantSession) {
    return this.estimates.listEstimates(session, listQuerySchema.parse(query) as any);
  }

  @Post("estimates")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:create")
  createEstimate(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    return this.estimates.createEstimate(session, createEstimateSchema.parse(body) as any);
  }

  @Get("estimates/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:read")
  getEstimate(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.estimates.getEstimate(session, id);
  }

  @Patch("estimates/:id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:write")
  updateEstimate(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.estimates.updateEstimate(session, id, updateEstimateSchema.parse(body) as any);
  }

  @Post("estimates/:id/import-survey-rooms")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:write")
  importSurveyRooms(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.estimates.importSurveyRooms(session, id);
  }

  @Post("estimates/:id/lines")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:write")
  addLine(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.estimates.addLine(session, id, lineSchema.parse(body) as any);
  }

  @Patch("estimates/:id/lines/:lineId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:write")
  updateLine(
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    return this.estimates.updateLine(session, id, lineId, lineSchema.parse(body) as any);
  }

  @Delete("estimates/:id/lines/:lineId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:write")
  deleteLine(
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @CurrentSession() session: TenantSession,
  ) {
    return this.estimates.deleteLine(session, id, lineId);
  }

  @Post("estimates/:id/recalculate")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:calculate")
  recalculate(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.estimates.recalculate(session, id);
  }

  @Post("estimates/:id/ready-for-quote")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:approve")
  readyForQuote(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.estimates.readyForQuote(session, id);
  }

  @Post("estimates/:id/cancel")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("estimate:write")
  cancel(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    return this.estimates.cancel(session, id);
  }
}

@Module({
  controllers: [EstimatesController],
  providers: [EstimatesService],
})
export class EstimatesModule {}
