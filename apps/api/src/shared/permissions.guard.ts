import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";
import { AuthorizationService } from "../services/authorization.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      session: Parameters<AuthorizationService["requirePermissions"]>[0];
    }>();
    this.authorization.requirePermissions(request.session, permissions);
    return true;
  }
}
