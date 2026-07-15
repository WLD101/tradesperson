import { Injectable, BadRequestException } from "@nestjs/common";
import { Prisma, MeasurementOperation } from "@prisma/client";

export type ComponentDimensions =
  | { type: "RECTANGLE"; length: number; width: number }
  | { type: "TRIANGLE"; base: number; height: number }
  | { type: "CIRCLE"; radius: number }
  | { type: "SEMICIRCLE"; radius: number }
  | { type: "ALCOVE"; length: number; width: number }
  | { type: "COLUMN"; length: number; width: number }
  | { type: "STAIR"; width: number; tread: number; riser: number; count: number }
  | { type: "LANDING"; length: number; width: number }
  | { type: "CORRIDOR"; length: number; width: number }
  | { type: "CUSTOM"; manualArea: number; reason: string };

@Injectable()
export class AreaCalculatorService {
  private validatePositive(val: number | undefined, name: string) {
    if (val === undefined || val === null || Number.isNaN(val)) {
      throw new BadRequestException(`Missing required dimension: ${name}`);
    }
    if (val <= 0 || !Number.isFinite(val) || val > 1000) {
      throw new BadRequestException(`Invalid dimension ${name}: must be positive, finite, and reasonable (<1000)`);
    }
  }

  calculateComponentArea(dimensions: ComponentDimensions): Prisma.Decimal {
    switch (dimensions.type) {
      case "RECTANGLE":
      case "ALCOVE":
      case "COLUMN":
      case "LANDING":
      case "CORRIDOR":
        this.validatePositive(dimensions.length, "length");
        this.validatePositive(dimensions.width, "width");
        return new Prisma.Decimal(dimensions.length).mul(new Prisma.Decimal(dimensions.width));
      case "TRIANGLE":
        this.validatePositive(dimensions.base, "base");
        this.validatePositive(dimensions.height, "height");
        return new Prisma.Decimal(0.5).mul(new Prisma.Decimal(dimensions.base)).mul(new Prisma.Decimal(dimensions.height));
      case "CIRCLE":
        this.validatePositive(dimensions.radius, "radius");
        return new Prisma.Decimal(Math.PI).mul(new Prisma.Decimal(dimensions.radius).pow(2));
      case "SEMICIRCLE":
        this.validatePositive(dimensions.radius, "radius");
        return new Prisma.Decimal(Math.PI).mul(new Prisma.Decimal(dimensions.radius).pow(2)).div(2);
      case "STAIR":
        this.validatePositive(dimensions.width, "width");
        this.validatePositive(dimensions.tread, "tread");
        this.validatePositive(dimensions.riser, "riser");
        this.validatePositive(dimensions.count, "count");
        return new Prisma.Decimal(dimensions.width)
          .mul(new Prisma.Decimal(dimensions.tread).add(new Prisma.Decimal(dimensions.riser)))
          .mul(new Prisma.Decimal(dimensions.count));
      case "CUSTOM":
        this.validatePositive(dimensions.manualArea, "manualArea");
        if (!dimensions.reason || dimensions.reason.trim().length === 0) {
          throw new BadRequestException("Manual overrides must include a reason.");
        }
        return new Prisma.Decimal(dimensions.manualArea);
      default:
        throw new BadRequestException("Unsupported shape for area calculation.");
    }
  }

  calculateRoomTotals(components: Array<{ operation: MeasurementOperation; area: Prisma.Decimal }>, wastePercentage: number = 0) {
    let netArea = new Prisma.Decimal(0);

    for (const comp of components) {
      if (comp.operation === "ADD") {
        netArea = netArea.add(comp.area);
      } else if (comp.operation === "DEDUCT") {
        netArea = netArea.sub(comp.area);
      }
    }

    if (netArea.lessThan(0)) {
      throw new BadRequestException("Net area cannot be negative (deductions exceed additions)");
    }

    netArea = new Prisma.Decimal(netArea.toFixed(4));
    const grossArea = netArea; 
    
    if (wastePercentage < 0 || !Number.isFinite(wastePercentage)) {
      throw new BadRequestException("Invalid wastePercentage");
    }
    
    const wasteFactor = new Prisma.Decimal(1).add(new Prisma.Decimal(wastePercentage).div(100));
    const wasteAdjustedArea = new Prisma.Decimal(netArea.mul(wasteFactor).toFixed(4));

    return {
      netArea,
      grossArea,
      wasteAdjustedArea,
    };
  }
}
