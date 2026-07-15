import { describe, expect, it } from "vitest";
import { loadEnv } from "./index";

describe("loadEnv", () => {
  it("parses a valid environment", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      DATABASE_URL: "https://database.example.com",
      DIRECT_URL: "https://database.example.com",
      REDIS_URL: "https://redis.example.com",
      WEB_URL: "https://web.example.com",
      API_URL: "https://api.example.com",
      INTERNAL_API_URL: "https://internal-api.example.com",
      AUTH_SECRET: "1234567890abcdef",
      AUTH_ISSUER: "issuer",
      AUTH_AUDIENCE: "audience",
      COOKIE_DOMAIN: "example.com",
      S3_ENDPOINT: "https://s3.example.com",
      S3_REGION: "eu-west-2",
      S3_BUCKET: "bucket",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "1025",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      MAIL_FROM: "noreply@example.com",
    });

    expect(env.NODE_ENV).toBe("test");
    expect(env.SMTP_PORT).toBe(1025);
  });

  it("fails when a required variable is missing", () => {
    expect(() => loadEnv({})).toThrow();
  });
});
