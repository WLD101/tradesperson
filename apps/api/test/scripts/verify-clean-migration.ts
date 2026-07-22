import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const DB_URL = "postgresql://postgres:postgres@localhost:55432/tradesperson_phased_clean_migration_test?schema=public";
process.env.DATABASE_URL = DB_URL;
process.env.DIRECT_URL = DB_URL;
if (!DB_URL || !DB_URL.includes('tradesperson_phased_clean_migration_test')) {
  console.error('ERROR: DATABASE_URL must point to tradesperson_phased_clean_migration_test');
  process.exit(1);
}

const ROOT_DIR = path.resolve(__dirname, '../../../..');
const DB_DIR = path.join(ROOT_DIR, 'packages/db');

async function main() {
  let prisma: PrismaClient | null = null;
  try {
    console.log('1. Applying all migrations from zero...');
    execSync(`pnpm exec prisma migrate deploy`, {
      stdio: 'inherit',
      cwd: DB_DIR,
      env: process.env,
    });

    console.log('2. Verifying database connection...');
    prisma = new PrismaClient({ datasourceUrl: DB_URL });
    const [{ count }] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM "_prisma_migrations"`);
    console.log(`Successfully applied ${count} migrations.`);
    console.log('Clean migration proof successful!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

main();
