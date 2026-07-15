import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../shared/auth.guard";
import { PrismaService } from "../services/prisma.service";

@Controller({ path: "permissions", version: "1" })
class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(AuthGuard)
  permissions() {
    return this.prisma.client.permission.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });
  }
}

@Module({
  controllers: [PermissionsController],
})
export class PermissionsModule {}
