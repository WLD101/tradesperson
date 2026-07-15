import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";
import { ZodError } from "zod";
import { requestContext } from "./request-context";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const normalized = this.normalize(exception);

    const status =
      normalized instanceof HttpException
        ? normalized.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      normalized instanceof HttpException
        ? normalized.getResponse()
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

  private normalize(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception;
    }

    if (exception instanceof ZodError) {
      return new HttpException(exception.message, HttpStatus.BAD_REQUEST);
    }

    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === "P2025"
    ) {
      return new NotFoundException("Resource not found.");
    }

    if (process.env.NODE_ENV !== "production") {
      console.error(exception);
    }

    return exception;
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
