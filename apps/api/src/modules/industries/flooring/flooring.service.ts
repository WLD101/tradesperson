import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../services/prisma.service';
import { CalculateRollCutDto, EstimateFlooringDto } from './dto/flooring.dto';

@Injectable()
export class FlooringService {
  constructor(private readonly prisma: PrismaService) {}

  // Automatically calculates square yards, gross sqft including waste factor
  calculateMaterialEstimate(dto: EstimateFlooringDto) {
    const grossSqFt = dto.netAreaSqFt * (1 + dto.wasteFactorPercent / 100);
    const grossSqYards = grossSqFt / 9;
    const requiredLinearFeet = grossSqFt / dto.rollWidthFt;

    return {
      netAreaSqFt: dto.netAreaSqFt,
      wasteFactorPercent: dto.wasteFactorPercent,
      grossSqFt: Math.ceil(grossSqFt),
      grossSqYards: Number(grossSqYards.toFixed(2)),
      requiredLinearFeet: Number(requiredLinearFeet.toFixed(2)),
    };
  }

  // Digital replacement for the "Cut Register Book"
  async executeRollCut(tenantId: string, userId: string, dto: CalculateRollCutDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const roll = await tx.inventoryRoll.findFirst({
        where: { id: dto.rollId, tenantId },
      });

      if (!roll) {
        throw new NotFoundException('Roll not found in inventory.');
      }

      const totalDeduction = dto.cutLengthFt + dto.wasteLengthFt;

      if (roll.currentLengthFt < totalDeduction) {
        throw new BadRequestException(
          `Insufficient roll balance. Available: ${roll.currentLengthFt}ft, Requested: ${totalDeduction}ft.`
        );
      }

      const newBalance = roll.currentLengthFt - totalDeduction;

      // 1. Log the Cut
      const cut = await tx.rollCut.create({
        data: {
          tenantId,
          rollId: dto.rollId,
          jobId: dto.jobId,
          cutLengthFt: dto.cutLengthFt,
          wasteLengthFt: dto.wasteLengthFt,
          cutByUserId: userId,
          notes: dto.notes ?? null,
        },
      });

      // 2. Update Roll Balance & Auto-flag as Remnant if under 10ft
      await tx.inventoryRoll.update({
        where: { id: dto.rollId },
        data: {
          currentLengthFt: newBalance,
          status: newBalance <= 0 ? 'EXHAUSTED' : newBalance < 10 ? 'REMNANT' : 'ACTIVE',
        },
      });

      return { cut, remainingBalanceFt: newBalance };
    });
  }
}
