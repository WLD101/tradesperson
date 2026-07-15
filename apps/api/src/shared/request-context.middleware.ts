import type { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { requestContext } from "./request-context";

export class RequestContextMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers["x-request-id"] as string | undefined) ?? uuid();
    res.setHeader("x-request-id", requestId);

    requestContext.run(
      {
        requestId,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      },
      next,
    );
  }
}
