import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./modules/app.module";
import { ApiExceptionFilter } from "./shared/api-exception.filter";
import { ResponseEnvelopeInterceptor } from "./shared/response-envelope.interceptor";
import { RequestContextMiddleware } from "./shared/request-context.middleware";
import { loadEnv } from "../../../packages/config/src";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: env.WEB_URL,
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Tradesperson ERP API")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(4000);
}

void bootstrap();
