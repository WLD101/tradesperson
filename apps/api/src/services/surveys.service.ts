import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import { AreaCalculatorService } from "./area-calculator.service";

type SurveyInput = {
  siteId: string;
  customerId?: string | null | undefined;
  leadId?: string | null | undefined;
  reference: string;
  purpose?: "ESTIMATE" | "MEASUREMENT" | "INSPECTION" | "REMEDIAL" | undefined;
};

type RoomInput = {
  name?: string | undefined;
  floorLevel?: string | undefined;
  existingCovering?: string | undefined;
  subfloorType?:
    | "CONCRETE"
    | "SAND_CEMENT_SCREED"
    | "ANHYDRITE_SCREED"
    | "TIMBER_BOARDS"
    | "PLYWOOD"
    | "CHIPBOARD"
    | "EXISTING_TILE"
    | "EXISTING_RESILIENT"
    | "RAISED_ACCESS"
    | "OTHER"
    | "UNKNOWN"
    | undefined;
  subfloorCondition?: string | undefined;
  underfloorHeating?: boolean | undefined;
  upliftRequired?: boolean | undefined;
  wastePercentage?: number | undefined;
  preparationNotes?: string | undefined;
  installationNotes?: string | undefined;
};

type MeasurementInput = {
  type?: string | undefined;
  operation?: "ADD" | "DEDUCT" | undefined;
  dimensions?: Record<string, unknown> | undefined;
  notes?: string | undefined;
};

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly calculator: AreaCalculatorService,
  ) {}

  async createSurvey(
    tenantId: string,
    userId: string,
    input: SurveyInput,
    branchId: string | null,
  ) {
    const site = await this.prisma.client.site.findFirstOrThrow({
      where: { id: input.siteId, tenantId },
      select: { id: true, customerId: true, branchId: true },
    });
    const customerId = input.customerId ?? site.customerId;

    if (customerId !== site.customerId) {
      throw new NotFoundException("Resource not found.");
    }

    await this.prisma.client.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
      select: { id: true },
    });

    if (input.leadId) {
      await this.prisma.client.lead.findFirstOrThrow({
        where: { id: input.leadId, tenantId },
        select: { id: true },
      });
    }

    const survey = await this.prisma.client.survey.create({
      data: {
        tenantId,
        siteId: input.siteId,
        customerId,
        leadId: input.leadId ?? null,
        branchId: branchId ?? site.branchId ?? null,
        reference: input.reference,
        purpose: input.purpose ?? null,
        createdById: userId,
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: userId,
      action: "survey.create",
      entityType: "survey",
      entityId: survey.id,
      newValues: input,
    });

    return survey;
  }

  async updateSurveyStatus(
    tenantId: string,
    userId: string,
    surveyId: string,
    newStatus: string,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });

    const validTransitions: Record<string, string[]> = {
      DRAFT: ["SCHEDULED", "CANCELLED"],
      SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED"],
      COMPLETED: ["REVIEWED"],
      REVIEWED: ["APPROVED"],
      APPROVED: ["SUPERSEDED"],
    };

    if (!validTransitions[survey.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition survey from ${survey.status} to ${newStatus}`,
      );
    }

    const updated = await this.prisma.client.survey.update({
      where: { id: surveyId },
      data: {
        status: newStatus as never,
        updatedById: userId,
        ...(newStatus === "SCHEDULED" ? { scheduledAt: new Date() } : {}),
        ...(newStatus === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...(newStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
        ...(newStatus === "REVIEWED" ? { reviewedAt: new Date() } : {}),
        ...(newStatus === "APPROVED" ? { approvedAt: new Date() } : {}),
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: userId,
      action: "survey.status_changed",
      entityType: "survey",
      entityId: survey.id,
      previousValues: { status: survey.status },
      newValues: { status: updated.status },
    });

    return updated;
  }

  async addRoom(
    tenantId: string,
    userId: string,
    surveyId: string,
    input: Required<Pick<RoomInput, "name">> & RoomInput,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });
    this.assertMutableState(survey.status, "add rooms");
    if (!input.name) {
      throw new BadRequestException("Room name is required.");
    }

    return this.prisma.client.surveyRoom.create({
      data: {
        tenantId,
        surveyId,
        name: input.name,
        floorLevel: input.floorLevel ?? null,
        existingCovering: input.existingCovering ?? null,
        subfloorType: input.subfloorType ?? null,
        subfloorCondition: input.subfloorCondition ?? null,
        underfloorHeating: input.underfloorHeating ?? false,
        upliftRequired: input.upliftRequired ?? false,
        wastePercentage: input.wastePercentage ?? 0,
        preparationNotes: input.preparationNotes ?? null,
        installationNotes: input.installationNotes ?? null,
        createdById: userId,
      },
    });
  }

  async getSurvey(tenantId: string, surveyId: string) {
    return this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
      include: {
        site: { select: { id: true, label: true, customerId: true } },
        customer: { select: { id: true, displayName: true } },
        rooms: {
          include: {
            components: {
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async updateDraft(
    tenantId: string,
    userId: string,
    surveyId: string,
    input: {
      reference?: string | undefined;
      purpose?: SurveyInput["purpose"] | undefined;
    },
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });

    if (!["DRAFT", "SCHEDULED", "IN_PROGRESS"].includes(survey.status)) {
      throw new BadRequestException(
        "Only DRAFT, SCHEDULED, or IN_PROGRESS surveys can be updated directly.",
      );
    }

    return this.prisma.client.survey.update({
      where: { id: surveyId },
      data: {
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
        updatedById: userId,
      },
    });
  }

  async listRooms(tenantId: string, surveyId: string) {
    await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });

    return this.prisma.client.surveyRoom.findMany({
      where: { tenantId, surveyId },
      include: { components: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async getRoom(tenantId: string, surveyId: string, roomId: string) {
    return this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
      include: { components: true },
    });
  }

  async updateRoom(
    tenantId: string,
    userId: string,
    surveyId: string,
    roomId: string,
    input: RoomInput,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });
    this.assertMutableState(survey.status, "edit rooms");

    const room = await this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
      select: { id: true, wastePercentage: true },
    });

    return this.prisma.client.$transaction(async (tx) => {
      const updatedRoom = await tx.surveyRoom.update({
        where: { id: room.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.floorLevel !== undefined ? { floorLevel: input.floorLevel } : {}),
          ...(input.existingCovering !== undefined
            ? { existingCovering: input.existingCovering }
            : {}),
          ...(input.subfloorType !== undefined ? { subfloorType: input.subfloorType } : {}),
          ...(input.subfloorCondition !== undefined
            ? { subfloorCondition: input.subfloorCondition }
            : {}),
          ...(input.underfloorHeating !== undefined
            ? { underfloorHeating: input.underfloorHeating }
            : {}),
          ...(input.upliftRequired !== undefined
            ? { upliftRequired: input.upliftRequired }
            : {}),
          ...(input.wastePercentage !== undefined
            ? { wastePercentage: input.wastePercentage }
            : {}),
          ...(input.preparationNotes !== undefined
            ? { preparationNotes: input.preparationNotes }
            : {}),
          ...(input.installationNotes !== undefined
            ? { installationNotes: input.installationNotes }
            : {}),
          updatedById: userId,
        },
      });

      await this.recalculateRoomTotals(
        tx,
        tenantId,
        room.id,
        updatedRoom.wastePercentage.toNumber(),
      );

      return tx.surveyRoom.findUniqueOrThrow({
        where: { id: room.id },
        include: { components: true },
      });
    });
  }

  async deleteRoom(
    tenantId: string,
    userId: string,
    surveyId: string,
    roomId: string,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });
    this.assertMutableState(survey.status, "delete rooms");

    const room = await this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
      select: { id: true },
    });

    await this.prisma.client.surveyRoom.delete({
      where: { id: room.id },
    });
    await this.audit.record({
      tenantId,
      actorUserId: userId,
      action: "survey.room.delete",
      entityType: "surveyRoom",
      entityId: room.id,
    });

    return { success: true };
  }

  async addMeasurement(
    tenantId: string,
    userId: string,
    surveyId: string,
    roomId: string,
    input: Required<Pick<MeasurementInput, "type" | "dimensions">> & MeasurementInput,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });
    this.assertMutableState(survey.status, "add measurements");

    const room = await this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
    });

    if (input.type === "CUSTOM") {
      throw new BadRequestException("Manual overrides (CUSTOM) are currently disabled.");
    }

    const calculatedArea = this.calculator.calculateComponentArea({
      type: input.type,
      ...input.dimensions,
    } as never);

    return this.prisma.client.$transaction(async (tx) => {
      const component = await tx.measurementComponent.create({
        data: {
          tenantId,
          roomId,
          type: input.type as never,
          operation: (input.operation ?? "ADD") as never,
          dimensions: input.dimensions as Prisma.InputJsonValue,
          calculatedArea,
          notes: input.notes ?? null,
          createdById: userId,
        },
      });

      await this.recalculateRoomTotals(
        tx,
        tenantId,
        roomId,
        room.wastePercentage.toNumber(),
      );

      return component;
    });
  }

  async updateMeasurement(
    tenantId: string,
    userId: string,
    surveyId: string,
    roomId: string,
    componentId: string,
    input: MeasurementInput,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });
    this.assertMutableState(survey.status, "update measurements");

    const room = await this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
    });
    const existing = await this.prisma.client.measurementComponent.findFirstOrThrow({
      where: { id: componentId, roomId, tenantId },
    });

    if (input.type === "CUSTOM") {
      throw new BadRequestException("Manual overrides (CUSTOM) are currently disabled.");
    }

    const nextType = input.type ?? existing.type;
    const nextDimensions = (input.dimensions ??
      existing.dimensions) as Record<string, unknown>;
    const calculatedArea =
      input.type !== undefined || input.dimensions !== undefined
        ? this.calculator.calculateComponentArea({
            type: nextType,
            ...nextDimensions,
          } as never)
        : undefined;

    return this.prisma.client.$transaction(async (tx) => {
      const component = await tx.measurementComponent.update({
        where: { id: existing.id },
        data: {
          ...(input.type !== undefined ? { type: input.type as never } : {}),
          ...(input.operation !== undefined
            ? { operation: input.operation as never }
            : {}),
          ...(input.dimensions !== undefined
            ? { dimensions: input.dimensions as Prisma.InputJsonValue }
            : {}),
          ...(calculatedArea !== undefined ? { calculatedArea } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updatedById: userId,
        },
      });

      await this.recalculateRoomTotals(
        tx,
        tenantId,
        roomId,
        room.wastePercentage.toNumber(),
      );

      return component;
    });
  }

  async deleteMeasurement(
    tenantId: string,
    userId: string,
    surveyId: string,
    roomId: string,
    componentId: string,
  ) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });
    this.assertMutableState(survey.status, "delete measurements");

    const room = await this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
    });
    const component = await this.prisma.client.measurementComponent.findFirstOrThrow({
      where: { id: componentId, roomId, tenantId },
      select: { id: true },
    });

    return this.prisma.client.$transaction(async (tx) => {
      await tx.measurementComponent.delete({
        where: { id: component.id },
      });

      await this.recalculateRoomTotals(
        tx,
        tenantId,
        roomId,
        room.wastePercentage.toNumber(),
      );

      return { success: true };
    });
  }

  private assertMutableState(status: string, action: string) {
    if (["COMPLETED", "REVIEWED", "APPROVED", "SUPERSEDED", "CANCELLED"].includes(status)) {
      throw new BadRequestException(
        `Cannot ${action} in an immutable survey state (${status}).`,
      );
    }
  }

  private async recalculateRoomTotals(
    tx: any,
    tenantId: string,
    roomId: string,
    wastePercentage: number,
  ) {
    const roomComps = await tx.measurementComponent.findMany({
      where: { roomId, tenantId },
    });

    const { netArea, grossArea, wasteAdjustedArea } =
      this.calculator.calculateRoomTotals(
        roomComps.map((component: { operation: any; calculatedArea: Prisma.Decimal }) => ({
          operation: component.operation,
          area: component.calculatedArea,
        })),
        wastePercentage,
      );

    await tx.surveyRoom.update({
      where: { id: roomId },
      data: {
        netArea,
        grossArea,
        wasteAdjustedArea,
      },
    });
  }
}
