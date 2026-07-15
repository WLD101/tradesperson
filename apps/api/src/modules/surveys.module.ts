import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { AuditService } from "../services/audit.service";
import { BranchAccessService } from "../services/branch-access.service";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";
import { AreaCalculatorService } from "../services/area-calculator.service";
import { SurveysService } from "../services/surveys.service";

const branchIdSchema = z.string().uuid().optional();

const surveySchema = z.object({
  siteId: z.string().uuid(),
  customerId: z.string().uuid(),
  leadId: z.string().uuid().optional().nullable(),
  branchId: branchIdSchema,
  reference: z.string().min(1),
  purpose: z.enum(["ESTIMATE", "MEASUREMENT", "INSPECTION", "REMEDIAL"]).optional(),
});

const surveyTransitionSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "APPROVED", "CANCELLED", "SUPERSEDED"]),
});

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

@Controller({ path: "surveys", version: "1" })
class SurveysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly surveysService: SurveysService
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.view")
  async list(@CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.survey.findMany({
      where: {
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      orderBy: { createdAt: "desc" },
      include: {
        site: { select: { id: true, label: true } },
        customer: { select: { id: true, displayName: true } },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = surveySchema.parse(body);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId,
      tenantId,
    );
    
    return this.surveysService.createSurvey(tenantId, session.user.id, input, branchId);
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async updateStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = surveyTransitionSchema.parse(body);
    return this.surveysService.updateSurveyStatus(tenantId, session.user.id, id, input.status);
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.view")
  async getSurvey(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.surveysService.getSurvey(tenantId, id);
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async updateDraft(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    // basic schema for draft update
    const schema = z.object({
      reference: z.string().min(1).optional(),
      purpose: z.enum(["ESTIMATE", "MEASUREMENT", "INSPECTION", "REMEDIAL"]).optional(),
    });
    const input = schema.parse(body);
    return this.surveysService.updateDraft(tenantId, session.user.id, id, input);
  }
}

const roomSchema = z.object({
  name: z.string().min(1),
  floorLevel: z.string().optional(),
});

@Controller({ path: "surveys/:surveyId/rooms", version: "1" })
class SurveyRoomsController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly surveysService: SurveysService
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.view")
  async listRooms(
    @Param("surveyId") surveyId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.surveysService.listRooms(tenantId, surveyId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async create(
    @Param("surveyId") surveyId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = roomSchema.parse(body);

    return this.surveysService.addRoom(tenantId, session.user.id, surveyId, input);
  }

  @Get(":roomId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.view")
  async getRoom(
    @Param("surveyId") surveyId: string,
    @Param("roomId") roomId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.surveysService.getRoom(tenantId, surveyId, roomId);
  }

  @Patch(":roomId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async updateRoom(
    @Param("surveyId") surveyId: string,
    @Param("roomId") roomId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = roomSchema.partial().parse(body);
    return this.surveysService.updateRoom(tenantId, session.user.id, surveyId, roomId, input);
  }
}

const componentSchema = z.object({
  type: z.enum(["RECTANGLE", "TRIANGLE", "CIRCLE", "SEMICIRCLE", "ALCOVE", "COLUMN", "STAIR", "LANDING", "CORRIDOR", "CUSTOM"]),
  operation: z.enum(["ADD", "DEDUCT"]).optional(),
  dimensions: z.any(), // Further validated in AreaCalculatorService
  notes: z.string().optional(),
});

@Controller({ path: "surveys/:surveyId/rooms/:roomId/components", version: "1" })
class MeasurementComponentsController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly surveysService: SurveysService,
    private readonly calculator: AreaCalculatorService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async createComponent(
    @Param("surveyId") surveyId: string,
    @Param("roomId") roomId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = componentSchema.parse(body);
    
    // Server calculates authoritative area based on validated dimensions
    // Wait, the client should not be trusted for area calculation
    const dimensions = input.dimensions as any;
    dimensions.type = input.type;
    const calculatedArea = this.calculator.calculateComponentArea(dimensions);

    const data = {
      ...input,
      calculatedArea,
    };
    return this.surveysService.addMeasurement(tenantId, session.user.id, surveyId, roomId, data);
  }
}

@Module({
  controllers: [SurveysController, SurveyRoomsController, MeasurementComponentsController],
  providers: [AreaCalculatorService, SurveysService],
})
export class SurveysModule {}
