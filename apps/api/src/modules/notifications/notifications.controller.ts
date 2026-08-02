import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../../shared/auth.guard';
import { CurrentSession } from '../../shared/session.decorator';
import { SessionContext } from '@tradesperson/types';
import { PrismaService } from '../../services/prisma.service';

@Controller({ path: 'notifications', version: '1' })
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('logs')
  async getLogs(@CurrentSession() session: SessionContext) {
    if (!session.activeTenantId) {
      return [];
    }

    return this.prisma.client.notificationLog.findMany({
      where: { tenantId: session.activeTenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
