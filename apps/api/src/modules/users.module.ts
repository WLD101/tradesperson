import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../shared/auth.guard";
import { CurrentSession } from "../shared/session.decorator";

@Controller({ path: "users", version: "1" })
class UsersController {
  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentSession() session: { user: unknown }) {
    return session.user;
  }
}

@Module({
  controllers: [UsersController],
})
export class UsersModule {}
