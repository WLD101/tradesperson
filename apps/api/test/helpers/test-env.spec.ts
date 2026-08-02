import { afterEach, describe, expect, test } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("ensureTestEnv", () => {
  test("defaults to the dedicated isolation test database", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
    delete process.env.NODE_ENV;

    const { buildLocalTestDatabaseUrl, ensureTestEnv } = await import("./test-env");
    const env = ensureTestEnv();

    expect(process.env.NODE_ENV).toBe("test");
    expect(env.databaseUrl).toBe(
      buildLocalTestDatabaseUrl("tradesperson_erp_isolation_test"),
    );
    expect(env.directUrl).toBe(env.databaseUrl);
    expect(env.testDbName).toBe("tradesperson_erp_isolation_test");
  });

  test("rejects destructive helpers without an explicit database url", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DIRECT_URL;
    delete process.env.NODE_ENV;

    const { ensureTestEnv } = await import("./test-env");

    expect(() =>
      ensureTestEnv({ requireExplicitDatabaseUrl: true }),
    ).toThrow(
      "Refusing to use destructive test database helpers without an explicit DATABASE_URL.",
    );
  });

  test("rejects a non-test database url", async () => {
    const { buildLocalTestDatabaseUrl } = await import("./test-env");
    process.env.DATABASE_URL =
      buildLocalTestDatabaseUrl("tradesperson_erp");
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    delete process.env.NODE_ENV;

    const { ensureTestEnv } = await import("./test-env");

    expect(() => ensureTestEnv()).toThrow(
      "Refusing to use non-test database URL",
    );
  });

  test("rejects an empty database url", async () => {
    process.env.DATABASE_URL = "";
    process.env.DIRECT_URL = "";
    delete process.env.NODE_ENV;

    const { ensureTestEnv } = await import("./test-env");

    expect(() => ensureTestEnv()).toThrow(
      "Refusing to use an empty test database URL.",
    );
  });

  test("rejects a malformed database url", async () => {
    process.env.DATABASE_URL = "not-a-url";
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    delete process.env.NODE_ENV;

    const { ensureTestEnv } = await import("./test-env");

    expect(() => ensureTestEnv()).toThrow(
      "Refusing to use malformed test database URL: not-a-url.",
    );
  });

  test("rejects a database url without a database name", async () => {
    const { buildLocalTestDatabaseUrl } = await import("./test-env");
    process.env.DATABASE_URL = buildLocalTestDatabaseUrl("");
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    delete process.env.NODE_ENV;

    const { ensureTestEnv } = await import("./test-env");

    expect(() => ensureTestEnv()).toThrow(
      "Refusing to use test database URL without a database name",
    );
  });

  test("rejects a database name that does not contain test", async () => {
    const { buildLocalTestDatabaseUrl } = await import("./test-env");
    process.env.DATABASE_URL =
      buildLocalTestDatabaseUrl("tradesperson_erp_isolation");
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    delete process.env.NODE_ENV;

    const { ensureTestEnv } = await import("./test-env");

    expect(() => ensureTestEnv()).toThrow(
      "Refusing to use non-test database URL",
    );
  });
});
