import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

function buildLocalTestDatabaseUrl(databaseName: string) {
  const url = new URL(`postgresql://localhost:55432/${databaseName}`);
  url.username = 'postgres';
  url.password = 'postgres';
  url.searchParams.set('schema', 'public');
  return url.toString();
}

const DB_URL = buildLocalTestDatabaseUrl('tradesperson_phased_seed_test');
process.env.DATABASE_URL = DB_URL;
process.env.DIRECT_URL = DB_URL;


const DB_DIR = `${__dirname}/../../../../packages/db`;

async function getCounts(prisma: PrismaClient) {
  const tables = [
    'PurchaseRequisition',
    'PurchaseRequisitionLine',
    'PurchaseOrder',
    'PurchaseOrderVersion',
    'PurchaseOrderLine',
    'SupplierAcknowledgement',
    'PurchaseOrderDeliveryPlan'
  ];
  
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM "${table}"`);
    counts[table] = Number(count);
  }
  return counts;
}

async function main() {
  let prisma: PrismaClient | null = null;
  try {
    console.log('1. Applying migrations...');
    execSync(`pnpm exec prisma migrate deploy`, {
      stdio: 'inherit',
      cwd: DB_DIR,
      env: process.env,
    });

    console.log('2. Running seed (first pass)...');
    execSync(`npx tsx prisma/seed.ts`, {
      stdio: 'inherit',
      cwd: DB_DIR,
      env: process.env,
    });

    prisma = new PrismaClient({ datasourceUrl: DB_URL });
    const countsFirstPass = await getCounts(prisma);
    console.log('Counts after first pass:', countsFirstPass);

    console.log('3. Running seed (second pass)...');
    execSync(`npx tsx prisma/seed.ts`, {
      stdio: 'inherit',
      cwd: DB_DIR,
      env: process.env,
    });

    const countsSecondPass = await getCounts(prisma);
    console.log('Counts after second pass:', countsSecondPass);

    let mismatch = false;
    for (const [table, count] of Object.entries(countsFirstPass)) {
      if (countsSecondPass[table] !== count) {
        console.error(`Count mismatch for ${table}: firstPass=${count}, secondPass=${countsSecondPass[table]}`);
        mismatch = true;
      }
    }

    if (mismatch) {
      throw new Error('Seed is not idempotent!');
    }

    console.log('Seed repeatability proof successful! No duplicates created.');

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
