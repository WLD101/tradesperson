import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import { BranchAccessService } from "./branch-access.service";
import { AreaCalculatorService } from "./area-calculator.service";

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  async createSurvey(tenantId: string, userId: string, input: any, branchId: string | null) {
    // Validate site and customer belong to tenant
    await this.prisma.client.site.findFirstOrThrow({
      where: { id: input.siteId, tenantId, customerId: input.customerId },
    });

    const survey = await this.prisma.client.survey.create({
      data: {
        tenantId,
        siteId: input.siteId,
        customerId: input.customerId,
        leadId: input.leadId ?? null,
        branchId,
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

  async updateSurveyStatus(tenantId: string, userId: string, surveyId: string, newStatus: string) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });

    // Enforce basic state transitions
    const validTransitions: Record<string, string[]> = {
      "DRAFT": ["SCHEDULED", "CANCELLED"],
      "SCHEDULED": ["IN_PROGRESS", "CANCELLED"],
      "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
      "COMPLETED": ["REVIEWED", "CANCELLED"],
      "REVIEWED": ["APPROVED", "CANCELLED"],
      "APPROVED": ["SUPERSEDED"],
    };

    if (!validTransitions[survey.status]?.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition survey from ${survey.status} to ${newStatus}`);
    }

    const updated = await this.prisma.client.survey.update({
      where: { id: surveyId },
      data: {
        status: newStatus as any,
        updatedById: userId,
        ...(newStatus === "SCHEDULED" ? { scheduledAt: new Date() } : {}),
        ...(newStatus === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
        ...(newStatus === "COMPLETED" ? { completedAt: new Date() } : {}),
        ...(newStatus === "REVIEWED" ? { reviewedAt: new Date(), reviewedById: userId } : {}),
        ...(newStatus === "APPROVED" ? { approvedAt: new Date(), approvedById: userId } : {}),
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

  async addRoom(tenantId: string, userId: string, surveyId: string, input: any) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });

    if (survey.status === "APPROVED" || survey.status === "SUPERSEDED" || survey.status === "CANCELLED") {
      throw new BadRequestException(`Cannot add rooms to a ${survey.status} survey.`);
    }

    const room = await this.prisma.client.surveyRoom.create({
      data: {
        tenantId,
        surveyId,
        name: input.name,
        floorLevel: input.floorLevel ?? null,
        createdById: userId,
      },
    });

    return room;
  }
  async getSurvey(tenantId: string, surveyId: string) {
    return this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
      include: {
        rooms: {
          include: { components: true }
        }
      }
    });
  }

  async updateDraft(tenantId: string, userId: string, surveyId: string, input: any) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({
      where: { id: surveyId, tenantId },
    });

    if (survey.status !== "DRAFT") {
      throw new BadRequestException("Only DRAFT surveys can be updated directly. Create a revision if APPROVED.");
    }

    const updated = await this.prisma.client.survey.update({
      where: { id: surveyId },
      data: {
        reference: input.reference !== undefined ? input.reference : survey.reference,
        purpose: input.purpose !== undefined ? input.purpose : survey.purpose,
        updatedById: userId,
      }
    });

    return updated;
  }

  async listRooms(tenantId: string, surveyId: string) {
    await this.prisma.client.survey.findFirstOrThrow({ where: { id: surveyId, tenantId } });
    return this.prisma.client.surveyRoom.findMany({
      where: { tenantId, surveyId },
      include: { components: true }
    });
  }

  async getRoom(tenantId: string, surveyId: string, roomId: string) {
    return this.prisma.client.surveyRoom.findFirstOrThrow({
      where: { id: roomId, surveyId, tenantId },
      include: { components: true }
    });
  }

  async updateRoom(tenantId: string, userId: string, surveyId: string, roomId: string, input: any) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({ where: { id: surveyId, tenantId } });
    if (survey.status === "APPROVED" || survey.status === "SUPERSEDED" || survey.status === "CANCELLED") {
      throw new BadRequestException("Cannot edit rooms in an immutable survey state.");
    }
    
    return this.prisma.client.surveyRoom.update({
      where: { id: roomId, tenantId },
      data: {
        name: input.name,
        floorLevel: input.floorLevel,
        updatedById: userId,
      }
    });
  }

  async deleteRoom(tenantId: string, userId: string, surveyId: string, roomId: string) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({ where: { id: surveyId, tenantId } });
    if (survey.status === "APPROVED" || survey.status === "SUPERSEDED" || survey.status === "CANCELLED") {
      throw new BadRequestException("Cannot delete rooms in an immutable survey state.");
    }

    await this.prisma.client.surveyRoom.delete({
      where: { id: roomId, tenantId }
    });
    return { success: true };
  }

  async addMeasurement(tenantId: string, userId: string, surveyId: string, roomId: string, input: any) {
    const survey = await this.prisma.client.survey.findFirstOrThrow({ where: { id: surveyId, tenantId } });
    if (survey.status === "APPROVED" || survey.status === "SUPERSEDED" || survey.status === "CANCELLED") {
      throw new BadRequestException("Cannot add measurements in an immutable survey state.");
    }

    const room = await this.prisma.client.surveyRoom.findFirstOrThrow({ where: { id: roomId, surveyId, tenantId } });
    
    return this.prisma.client.$transaction(async (tx) => {
      const component = await tx.measurementComponent.create({
        data: {
          tenantId,
          roomId,
          type: input.type,
          operation: input.operation ?? "ADD",
          dimensions: input.dimensions,
          calculatedArea: input.calculatedArea, // Authoritative from controller
          notes: input.notes,
          createdById: userId,
        },
      });

      if (input.type === "CUSTOM") {
        await this.audit.record({
          tenantId,
          actorUserId: userId,
          action: "measurement.manual_override",
          entityType: "measurementComponent",
          entityId: component.id,
          newValues: { manualArea: input.calculatedArea, reason: input.dimensions?.reason },
        });
      }

      // Recalculate room totals
      const roomComps = await tx.measurementComponent.findMany({
        where: { roomId, tenantId },
      });

      const { netArea, grossArea, wasteAdjustedArea } =
        new AreaCalculatorService().calculateRoomTotals(
          roomComps.map((c) => ({
            operation: c.operation,
            area: c.calculatedArea,
          })),
        );

      await tx.surveyRoom.update({
        where: { id: roomId, tenantId },
        data: {
          netArea,
          grossArea,
          wasteAdjustedArea,
        },
      });

      return component;
    });
  }
}
