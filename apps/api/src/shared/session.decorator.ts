import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { SessionContext } from "../../../../packages/types/src";

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<{ session?: SessionContext }>();
    if (!request.session) {
      throw new UnauthorizedException("Authentication required.");
    }

    return request.session;
  },
);
