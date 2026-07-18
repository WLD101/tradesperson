import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { AuditService } from "./audit.service";
import { SupplierPricingService } from "./supplier-pricing.service";
import {
  createIsolationFixtures,
  type IsolationFixtureSet,
} from "../../test/helpers/tenant-fixtures";
import {
  disconnectDatabase,
  prisma,
  recreateTestDatabase,
  resetDatabase,
} from "../../test/helpers/test-db";

async function createPersistedImport(fixtures: IsolationFixtureSet) {
  const importRecord = await prisma.supplierPriceImport.create({
    data: {
      tenantId: fixtures.tenantA.id,
      supplierId: fixtures.supplierA.id,
      fileType: "CSV",
      sourceFilename: "supplier-prices.csv",
      headerRowNumber: 1,
      rowCount: 1,
      validRowCount: 1,
      invalidRowCount: 0,
      unmatchedRowCount: 0,
      duplicateRowCount: 0,
      mappingSnapshot: {
        headers: [
          "supplier product id",
          "supplier sku",
          "price basis",
          "currency",
          "base cost",
          "effective date",
        ],
        columns: {
          supplierProductId: "supplier product id",
          supplierSku: "supplier sku",
          priceBasis: "price basis",
          currency: "currency",
          baseCost: "base cost",
          effectiveDate: "effective date",
        },
      },
      validationSummary: {
        phase: "PARSED",
      },
      createdById: fixtures.ownerA.userId,
    },
  });

  await prisma.supplierPriceImportRow.create({
    data: {
      tenantId: fixtures.tenantA.id,
      supplierId: fixtures.supplierA.id,
      importId: importRecord.id,
      supplierProductId: fixtures.supplierProductA.id,
      matchedProductId: fixtures.productA.id,
      rowNumber: 2,
      status: "VALID",
      rawData: {
        "supplier product id": fixtures.supplierProductA.id,
        "supplier sku": "SUP-A-CARPET-001",
        "price basis": "ROLL",
        currency: "GBP",
        "base cost": "12.5000",
        "effective date": "2026-07-16",
      },
      normalizedData: {
        supplierSku: "SUP-A-CARPET-001",
        supplierProductId: fixtures.supplierProductA.id,
        productSku: null,
        productName: null,
        variantSku: null,
        unit: "ROLL",
        priceBasis: "ROLL",
        currency: "GBP",
        baseCost: "12.5000",
        packCost: null,
        rollCost: null,
        areaCost: null,
        quantityFrom: null,
        quantityTo: null,
        minimumOrderQty: null,
        effectiveDate: "2026-07-16T00:00:00.000Z",
        expiryDate: null,
        promotionalCost: null,
        promotionStart: null,
        promotionEnd: null,
        taxTreatmentCode: null,
        matchMethod: "SUPPLIER_PRODUCT_ID",
        executionStatus: "PENDING",
        createdPriceId: null,
      },
      errorMessages: [],
      warningMessages: [],
    },
  });

  return importRecord;
}

describe("SupplierPricingService imports", { timeout: 60_000 }, () => {
  let service: SupplierPricingService;
  let fixtures: IsolationFixtureSet;

  beforeAll(
    async () => {
      await recreateTestDatabase();
      const prismaService = { client: prisma };
      const audit = new AuditService(prismaService as never);
      service = new SupplierPricingService(prismaService as never, audit);
    },
    60_000,
  );

  beforeEach(
    async () => {
      await resetDatabase();
      fixtures = await createIsolationFixtures();
    },
    60_000,
  );

  afterAll(async () => {
    await disconnectDatabase();
  });

  test("returns the existing executed import on sequential retries", async () => {
    const importRecord = await createPersistedImport(fixtures);

    await service.validatePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
    );
    await service.approvePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
      fixtures.ownerA.userId,
    );

    const firstExecution = await service.executePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
      fixtures.ownerA.userId,
    );
    const secondExecution = await service.executePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
      fixtures.ownerA.userId,
    );

    const versions = await prisma.supplierPriceListVersion.findMany({
      where: { sourceImportId: importRecord.id },
    });

    expect(firstExecution.status).toBe("EXECUTED");
    expect(secondExecution.status).toBe("EXECUTED");
    expect(versions).toHaveLength(1);
    expect(firstExecution.validationSummary).toMatchObject({
      phase: "COMPLETED",
      createdVersionId: versions[0]?.id,
    });
  });

  test("claims execution safely under concurrent retries without duplicating records", async () => {
    const importRecord = await createPersistedImport(fixtures);

    await service.validatePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
    );
    await service.approvePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
      fixtures.ownerA.userId,
    );

    const [firstAttempt, secondAttempt] = await Promise.allSettled([
      service.executePriceImport(
        fixtures.tenantA.id,
        fixtures.supplierA.id,
        importRecord.id,
        fixtures.ownerA.userId,
      ),
      service.executePriceImport(
        fixtures.tenantA.id,
        fixtures.supplierA.id,
        importRecord.id,
        fixtures.ownerA.userId,
      ),
    ]);

    const refreshedImport = await prisma.supplierPriceImport.findUniqueOrThrow({
      where: { id: importRecord.id },
    });
    const versions = await prisma.supplierPriceListVersion.findMany({
      where: { sourceImportId: importRecord.id },
    });
    const prices = await prisma.supplierProductPrice.findMany({
      where: { supplierId: fixtures.supplierA.id },
    });
    const history = await prisma.supplierProductPriceHistory.findMany({
      where: { supplierId: fixtures.supplierA.id },
    });
    const rows = await prisma.supplierPriceImportRow.findMany({
      where: { importId: importRecord.id },
    });

    const fulfilledAttempts = [firstAttempt, secondAttempt].filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof service.executePriceImport>>> =>
        result.status === "fulfilled",
    );
    const rejectedAttempts = [firstAttempt, secondAttempt].filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(fulfilledAttempts.length).toBeGreaterThanOrEqual(1);
    expect(versions).toHaveLength(1);
    expect(prices).toHaveLength(1);
    expect(history).toHaveLength(1);
    expect(rows.every((row) => row.status === "IMPORTED")).toBe(true);
    expect(refreshedImport.status).toBe("EXECUTED");
    expect(refreshedImport.validationSummary).toMatchObject({
      phase: "COMPLETED",
      createdVersionId: versions[0]?.id,
    });

    for (const result of fulfilledAttempts) {
      expect(result.value.status).toBe("EXECUTED");
      expect(result.value.validationSummary).toMatchObject({
        phase: "COMPLETED",
        createdVersionId: versions[0]?.id,
      });
    }

    for (const result of rejectedAttempts) {
      expect(result.reason).toBeInstanceOf(Error);
      expect(String(result.reason.message)).toContain(
        "Import execution is already in progress.",
      );
    }
  });

  test("rejects execution before approval", async () => {
    const importRecord = await createPersistedImport(fixtures);

    await expect(
      service.executePriceImport(
        fixtures.tenantA.id,
        fixtures.supplierA.id,
        importRecord.id,
        fixtures.ownerA.userId,
      ),
    ).rejects.toThrow("Only approved imports can be executed.");
  });

  test("rolls back partial execution work and marks the import failed", async () => {
    const importRecord = await createPersistedImport(fixtures);

    await service.validatePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
    );
    await service.approvePriceImport(
      fixtures.tenantA.id,
      fixtures.supplierA.id,
      importRecord.id,
      fixtures.ownerA.userId,
    );

    await prisma.supplierPriceImportRow.updateMany({
      where: { importId: importRecord.id },
      data: {
        normalizedData: {
          supplierSku: "SUP-A-CARPET-001",
          supplierProductId: fixtures.supplierProductA.id,
          productSku: null,
          productName: null,
          variantSku: null,
          unit: "ROLL",
          priceBasis: "INVALID_BASIS",
          currency: "GBP",
          baseCost: "12.5000",
          packCost: null,
          rollCost: null,
          areaCost: null,
          quantityFrom: null,
          quantityTo: null,
          minimumOrderQty: null,
          effectiveDate: "2026-07-16T00:00:00.000Z",
          expiryDate: null,
          promotionalCost: null,
          promotionStart: null,
          promotionEnd: null,
          taxTreatmentCode: null,
          matchMethod: "SUPPLIER_PRODUCT_ID",
          executionStatus: "PENDING",
          createdPriceId: null,
        },
      },
    });

    await expect(
      service.executePriceImport(
        fixtures.tenantA.id,
        fixtures.supplierA.id,
        importRecord.id,
        fixtures.ownerA.userId,
      ),
    ).rejects.toThrow();

    const refreshedImport = await prisma.supplierPriceImport.findUniqueOrThrow({
      where: { id: importRecord.id },
    });
    const versions = await prisma.supplierPriceListVersion.findMany({
      where: { sourceImportId: importRecord.id },
    });
    const prices = await prisma.supplierProductPrice.findMany({
      where: { supplierId: fixtures.supplierA.id },
    });
    const history = await prisma.supplierProductPriceHistory.findMany({
      where: { supplierId: fixtures.supplierA.id },
    });
    const rows = await prisma.supplierPriceImportRow.findMany({
      where: { importId: importRecord.id },
    });
    const priceLists = await prisma.supplierPriceList.findMany({
      where: { supplierId: fixtures.supplierA.id },
    });

    expect(refreshedImport.status).toBe("FAILED");
    expect(refreshedImport.errorSummary).toMatchObject({
      code: "IMPORT_EXECUTION_FAILED",
    });
    expect(refreshedImport.executedAt).toBeNull();
    expect(refreshedImport.executedById).toBeNull();
    expect(versions).toHaveLength(0);
    expect(priceLists).toHaveLength(0);
    expect(prices).toHaveLength(0);
    expect(history).toHaveLength(0);
    expect(rows.every((row) => row.status === "VALID")).toBe(true);
    expect(
      rows.every((row) => {
        const normalizedData = row.normalizedData as Record<string, unknown>;
        return normalizedData.executionStatus === "PENDING" && normalizedData.createdPriceId === null;
      }),
    ).toBe(true);
  });
});
