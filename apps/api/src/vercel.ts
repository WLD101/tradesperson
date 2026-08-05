import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { ResponseEnvelopeInterceptor } from "./shared/response-envelope.interceptor";
import { RequestContextMiddleware } from "./shared/request-context.middleware";
import { loadEnv } from "../../../packages/config/src";
import { Express } from "express";

let cachedServer: Express;

async function bootstrapServer(): Promise<Express> {
  if (!cachedServer) {
    loadEnv();
    const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

    app.enableCors({
      origin: process.env.WEB_URL,
      credentials: true,
    });
    app.use(cookieParser());
    app.use(helmet());
    app.use(new RequestContextMiddleware().use);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    app.setGlobalPrefix("api");
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: "v",
      defaultVersion: "1",
    });

    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}
