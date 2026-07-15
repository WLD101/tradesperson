import {
  Body,
  Controller,
  Get,
  Module,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { Response } from "express";
import { SessionAuthService } from "../services/session-auth.service";
import { AuthGuard } from "../shared/auth.guard";
import { CurrentSession } from "../shared/session.decorator";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

@Controller({ path: "auth", version: "1" })
class AuthController {
  constructor(private readonly auth: SessionAuthService) {}

  @Post("sign-in")
  async signIn(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = signInSchema.parse(body);
    return this.auth.signIn(input.email, input.password, res);
  }

  @Get("session")
  @UseGuards(AuthGuard)
  async session(@CurrentSession() session: unknown) {
    return session;
  }

  @Post("logout")
  async logout(
    @Body() _body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(res.req.cookies?.tp_session, res);
  }
}

@Module({
  controllers: [AuthController],
})
export class AuthModule {}
