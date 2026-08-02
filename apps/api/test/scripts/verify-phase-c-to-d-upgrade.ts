import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function buildLocalTestDatabaseUrl(databaseName: string) {
  const url = new URL(`postgresql://localhost:55432/${databaseName}`);
  url.username = 'postgres';
  url.password = 'postgres';
  url.searchParams.set('schema', 'public');
  return url.toString();
}

const DB_URL = buildLocalTestDatabaseUrl('tradesperson_phased_upgrade_test');
process.env.DATABASE_URL = DB_URL;
process.env.DIRECT_URL = DB_URL;

const ROOT_DIR = path.resolve(__dirname, '../../../..');
const DB_DIR = path.join(ROOT_DIR, 'packages/db');
const SCHEMA_FILE = path.join(DB_DIR, 'prisma/schema.prisma');
const MIGRATIONS_DIR = path.join(DB_DIR, 'prisma/migrations');
const TMP_PRISMA_DIR = path.join(DB_DIR, 'tmp_prisma');

async function main() {
  let prisma: PrismaClient | null = null;
  try {
    console.log('1. Preparing temporary Prisma directory for Phase C...');
    if (fs.existsSync(TMP_PRISMA_DIR)) {
      fs.rmSync(TMP_PRISMA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TMP_PRISMA_DIR, { recursive: true });
    fs.mkdirSync(path.join(TMP_PRISMA_DIR, 'migrations'), { recursive: true });

    // Copy schema
    fs.copyFileSync(SCHEMA_FILE, path.join(TMP_PRISMA_DIR, 'schema.prisma'));

    // Copy Phase C migrations
    const migrations = fs.readdirSync(MIGRATIONS_DIR);
    for (const migration of migrations) {
      if (migration === 'migration_lock.toml' || migration <= '20260716172414_phase_c_supplier_pricing_foundation') {
        const src = path.join(MIGRATIONS_DIR, migration);
        const dest = path.join(TMP_PRISMA_DIR, 'migrations', migration);
        if (fs.lstatSync(src).isDirectory()) {
          fs.cpSync(src, dest, { recursive: true });
        } else {
          fs.copyFileSync(src, dest);
        }
      }
    }

    console.log('2. Applying migrations up to Phase C...');
    execSync(`pnpm exec prisma migrate deploy --schema tmp_prisma/schema.prisma`, {
      stdio: 'inherit',
      cwd: DB_DIR,
      env: process.env,
    });

    console.log('3. Seeding Phase C data using raw SQL...');
    prisma = new PrismaClient({
      datasourceUrl: DB_URL,
    });

    const tenantId = randomUUID();
    const branchId = randomUUID();
    const userId = randomUUID();
    const membershipId = randomUUID();
    const supplierId = randomUUID();
    const categoryId = randomUUID();
    const primaryUnitId = randomUUID();
    const productId = randomUUID();
    const variantId = randomUUID();
    const supplierProductId = randomUUID();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" ("id", "name", "slug", "countryCode", "currencyCode", "timeZone", "status", "createdAt", "updatedAt")
      VALUES ('${tenantId}', 'Test Tenant', 'test-tenant', 'GB', 'GBP', 'Europe/London', 'ACTIVE'::"TenantStatus", NOW(), NOW());
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Branch" ("id", "tenantId", "name", "branchCode", "type", "status", "createdAt", "updatedAt")
      VALUES ('${branchId}', '${tenantId}', 'Main Branch', 'B001', 'SHOWROOM'::"BranchType", 'ACTIVE'::"BranchStatus", NOW(), NOW());
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Supplier" ("id", "tenantId", "legalName", "supplierCode", "status", "defaultCurrency", "preferredSupplier", "createdAt", "updatedAt")
      VALUES ('${supplierId}', '${tenantId}', 'Test Supplier Ltd', 'SUP001', 'ACTIVE'::"SupplierStatus", 'GBP', false, NOW(), NOW());
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "ProductCategory" ("id", "tenantId", "name", "slug", "createdAt", "updatedAt")
      VALUES ('${categoryId}', '${tenantId}', 'Test Category', 'test-category', NOW(), NOW());
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "UnitOfMeasure" ("id", "tenantId", "name", "code", "createdAt", "updatedAt")
      VALUES ('${primaryUnitId}', '${tenantId}', 'Each', 'EA', NOW(), NOW());
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Product" ("id", "tenantId", "categoryId", "primaryUnitId", "name", "slug", "sku", "batchTrackingRequired", "createdAt", "updatedAt")
      VALUES ('${productId}', '${tenantId}', '${categoryId}', '${primaryUnitId}', 'Test Product', 'test-product', 'PROD-001', false, NOW(), NOW());
    `);

    const tables = [
      'Tenant', 'Branch', 'User', 'TenantMembership', 'ProductCategory', 'UnitOfMeasure',
      'Product', 'ProductVariant', 'Supplier', 'SupplierProduct', 'SupplierPriceList',
      'SupplierPriceListVersion', 'SupplierProductPrice', 'SupplierProductPriceHistory'
    ];

    const countsBefore: Record<string, number> = {};
    const idsBefore: Record<string, string[]> = {};

    for (const table of tables) {
      const [{ count }] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM "${table}"`);
      countsBefore[table] = Number(count);
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM "${table}" ORDER BY id`);
      idsBefore[table] = rows.map(r => r.id);
    }

    console.log('4. Applying Phase D migration...');
    execSync(`pnpm exec prisma migrate deploy`, {
      stdio: 'inherit',
      cwd: DB_DIR,
      env: process.env,
    });

    for (const table of tables) {
      const [{ count }] = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as count FROM \"${table}\"`);
      if (Number(count) !== countsBefore[table]) {
        throw new Error(`Count mismatch for ${table}: before=${countsBefore[table]}, after=${count}`);
      }
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM \"${table}\" ORDER BY id`);
      const afterIds = rows.map(r => r.id);
      if (JSON.stringify(afterIds) !== JSON.stringify(idsBefore[table])) {
        throw new Error(`ID mismatch for ${table}: IDs changed after migration`);
      }
    }

    console.log('5. Creating Phase D records...');
    
    // Attempt to create a Procurement record to prove the new schema is active
    await prisma.$executeRawUnsafe(`
      INSERT INTO "PurchaseRequisition" ("id", "tenantId", "branchId", "requisitionNumber", "status", "requestedById", "createdAt", "updatedAt")
      VALUES ('${randomUUID()}', '${tenantId}', '${branchId}', 'REQ-0001', 'DRAFT', '${userId}', NOW(), NOW());
    `);
    
    console.log('Upgrade proof successful! All Phase C records survived intact and Phase D writes are functional.');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    if (fs.existsSync(TMP_PRISMA_DIR)) {
      fs.rmSync(TMP_PRISMA_DIR, { recursive: true, force: true });
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

main();
