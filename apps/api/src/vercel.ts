import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { Request, Response } from "express";
import { AppModule } from "./modules/app.module";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { ResponseEnvelopeInterceptor } from "./shared/response-envelope.interceptor";
import { RequestContextMiddleware } from "./shared/request-context.middleware";
import { loadEnv } from "../../../packages/config/src";

let cachedServer: express.Application;

async function bootstrapServer(): Promise<express.Application> {
  if (!cachedServer) {
    loadEnv();
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), { bufferLogs: true, rawBody: true });

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
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
