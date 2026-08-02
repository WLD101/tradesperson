import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FlooringService } from './flooring.service';
import { CalculateRollCutSchema, EstimateFlooringSchema } from './dto/flooring.dto';
import { AuthGuard } from '../../../shared/auth.guard';
import { CurrentSession } from '../../../shared/session.decorator';

@Controller({ path: 'flooring', version: '1' })
@UseGuards(AuthGuard)
export class FlooringController {
  constructor(private readonly flooringService: FlooringService) {}

  @Post('roll-cuts')
  async executeRollCut(
    @CurrentSession() session: any,
    @Body() body: unknown,
  ) {
    if (!session.activeTenantId) throw new Error('Tenant required');
    const dto = CalculateRollCutSchema.parse(body);
    return this.flooringService.executeRollCut(session.activeTenantId, session.user.id, dto);
  }

  @Post('estimate')
  async calculateEstimate(
    @CurrentSession() session: any,
    @Body() body: unknown,
  ) {
    if (!session.activeTenantId) throw new Error('Tenant required');
    const dto = EstimateFlooringSchema.parse(body);
    return this.flooringService.calculateMaterialEstimate(dto);
  }
}
