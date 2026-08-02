import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PortalService } from './portal.service';
import { AcceptEstimateDto } from './dto/portal.dto';

@Controller({ path: 'public/portal', version: '1' })
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('invoices/:token')
  async getInvoice(@Param('token') token: string) {
    return this.portalService.getPublicInvoiceByToken(token);
  }

  @Get('estimates/:token')
  async getEstimate(@Param('token') token: string) {
    return this.portalService.getPublicEstimateByToken(token);
  }

  @Post('estimates/:token/accept')
  async acceptEstimate(
    @Param('token') token: string,
    @Body() dto: AcceptEstimateDto
  ) {
    return this.portalService.acceptEstimate(token, dto);
  }
}
