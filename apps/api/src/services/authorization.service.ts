import { ForbiddenException, Injectable } from "@nestjs/common";
import { hasPermission } from "../../../../packages/auth/src";
import type { SessionContext } from "../../../../packages/types/src";

@Injectable()
export class AuthorizationService {
  requirePermissions(session: SessionContext, permissions: string[]) {
    for (const permission of permissions) {
      if (!hasPermission(session, permission)) {
        throw new ForbiddenException(
          "You do not have permission to perform this action.",
        );
      }
    }
  }
}
