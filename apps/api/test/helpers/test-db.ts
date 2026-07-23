import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { ensureTestEnv } from "./test-env";

const currentDir = __dirname;
const rootDir = path.resolve(currentDir, "../../../..");
const dbPackageDir = path.resolve(rootDir, "packages/db");

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
let testDatabaseBootstrapPromise: Promise<void> | null = null;
let testDatabaseBootstrapped = false;

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: ensureTestEnv().databaseUrl,
    },
  },
});

const getAdminConnectionString = (databaseUrl: string) => {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
};

const recreateTestDatabaseOnce = async () => {
  const { databaseUrl, testDbName } = ensureTestEnv({
    requireExplicitDatabaseUrl: true,
  });
  const client = new Client({
    connectionString: getAdminConnectionString(databaseUrl!),
  });

  await client.connect();
  await client.query(
    `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()
    `,
    [testDbName],
  );
  await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
  await client.query(`CREATE DATABASE "${testDbName}"`);
  await client.end();

  execSync(`${pnpmCmd} exec prisma migrate deploy --schema prisma/schema.prisma`, {
    cwd: dbPackageDir,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
    },
  });
};

export const recreateTestDatabase = async (options?: { force?: boolean }) => {
  const force = options?.force ?? false;
  if (force) {
    testDatabaseBootstrapPromise = null;
    testDatabaseBootstrapped = false;
  }

  if (testDatabaseBootstrapped) {
    return;
  }

  if (!testDatabaseBootstrapPromise) {
    testDatabaseBootstrapPromise = recreateTestDatabaseOnce()
      .then(() => {
        testDatabaseBootstrapped = true;
      })
      .catch((error) => {
        testDatabaseBootstrapPromise = null;
        testDatabaseBootstrapped = false;
        throw error;
      });
  }

  await testDatabaseBootstrapPromise;
};

export const resetDatabase = async () => {
  ensureTestEnv({
    requireExplicitDatabaseUrl: true,
  });
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (!rows.length) {
    return;
  }

  const tables = rows
    .map((row) => `"public"."${row.tablename}"`)
    .join(", ");

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  );
};

export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};
