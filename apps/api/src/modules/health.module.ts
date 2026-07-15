import { Controller, Get, Module } from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";
import { RedisService } from "../services/redis.service";

@Controller()
class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get("health")
  async health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  async ready() {
    await this.prisma.client.$queryRaw`SELECT 1`;
    await this.redis.ping();

    return { status: "ready", database: "ok", redis: "ok" };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
