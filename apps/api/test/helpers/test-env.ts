import { randomUUID } from "node:crypto";

const testDbName = "tradesperson_erp_isolation_test";

export const ensureTestEnv = () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    `postgresql://postgres:postgres@localhost:55432/${testDbName}`;
  process.env.DIRECT_URL =
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL;
  process.env.REDIS_URL =
    process.env.REDIS_URL ?? "redis://localhost:6379";
  process.env.WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
  process.env.API_URL = process.env.API_URL ?? "http://localhost:4000";
  process.env.INTERNAL_API_URL =
    process.env.INTERNAL_API_URL ?? "http://localhost:4000";
  process.env.AUTH_SECRET =
    process.env.AUTH_SECRET ?? "test-secret-value-1234567890";
  process.env.AUTH_ISSUER =
    process.env.AUTH_ISSUER ?? "tradesperson-net-erp-test";
  process.env.AUTH_AUDIENCE =
    process.env.AUTH_AUDIENCE ?? "tradesperson-erp-test-users";
  process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "localhost";
  process.env.S3_ENDPOINT =
    process.env.S3_ENDPOINT ?? "http://localhost:9000";
  process.env.S3_REGION = process.env.S3_REGION ?? "eu-west-2";
  process.env.S3_BUCKET =
    process.env.S3_BUCKET ?? `tradesperson-erp-test-${randomUUID()}`;
  process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? "minio";
  process.env.S3_SECRET_ACCESS_KEY =
    process.env.S3_SECRET_ACCESS_KEY ?? "miniosecret";
  process.env.SMTP_HOST = process.env.SMTP_HOST ?? "localhost";
  process.env.SMTP_PORT = process.env.SMTP_PORT ?? "1025";
  process.env.SMTP_USER = process.env.SMTP_USER ?? "";
  process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? "";
  process.env.MAIL_FROM =
    process.env.MAIL_FROM ?? "noreply@tradesperson.local";

  return {
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
    testDbName,
  };
};
