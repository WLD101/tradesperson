import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { requestContext } from "./request-context";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal server error" };
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(", ")
          : String(payload.message)
        : "Internal server error";

    response.status(status).json({
      data: null,
      meta: { requestId: requestContext.get()?.requestId ?? "unknown" },
      error: {
        code: this.codeFromStatus(status),
        message,
        details: [],
      },
    });
  }

  private codeFromStatus(status: number) {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      default:
        return "INTERNAL_SERVER_ERROR";
    }
  }
}
