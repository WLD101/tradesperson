import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SessionAuthService } from "../services/session-auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: SessionAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ cookies?: Record<string, string>; session?: unknown }>();
    const session = await this.auth.getSessionFromCookie(
      request.cookies?.tp_session,
    );
    if (!session) {
      throw new UnauthorizedException("Authentication required.");
    }

    request.session = session;
    return true;
  }
}
