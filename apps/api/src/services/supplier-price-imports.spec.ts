import { SupplierPriceImportFileType } from "@prisma/client";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  IMPORT_FILE_SIZE_LIMIT_BYTES,
  IMPORT_MAX_CELL_LENGTH,
  IMPORT_MAX_COLUMNS,
  IMPORT_MAX_ROWS,
  IMPORT_MAX_WORKSHEETS,
  assertSupportedImportFile,
  normalizeImportRows,
  parseImportFile,
  summarizeNormalizedRows,
  type ImportUploadFile,
} from "./supplier-price-imports";

vi.mock("read-excel-file/node", () => ({
  default: vi.fn(),
}));

function buildFile(overrides: Partial<ImportUploadFile> = {}): ImportUploadFile {
  const buffer = overrides.buffer ?? Buffer.from("supplier sku,price basis,currency,base cost,effective date\nSUP-001,ROLL,GBP,12.5,2026-07-16\n");
  return {
    originalname: overrides.originalname ?? "prices.csv",
    mimetype: overrides.mimetype ?? "text/csv",
    size: overrides.size ?? buffer.length,
    buffer,
  };
}

describe("supplier price import helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("accepts supported csv files", () => {
    expect(assertSupportedImportFile(buildFile())).toBe(
      SupplierPriceImportFileType.CSV,
    );
  });

  test("rejects unsupported content types", () => {
    expect(() =>
      assertSupportedImportFile(
        buildFile({ mimetype: "application/octet-stream" }),
      ),
    ).toThrow("Unsupported import file content type.");
  });

  test("rejects files that exceed the size limit", () => {
    expect(() =>
      assertSupportedImportFile(
        buildFile({ size: IMPORT_FILE_SIZE_LIMIT_BYTES + 1 }),
      ),
    ).toThrow("Import file exceeds the 5MB size limit.");
  });

  test("parses csv files with a BOM and quoted values", async () => {
    const file = buildFile({
      buffer: Buffer.from(
        "\uFEFFsupplier sku,price basis,currency,base cost,effective date,product name\nSUP-001,ROLL,GBP,12.5,2026-07-16,\"Premium plank, oak\"\n",
      ),
    });

    const parsed = await parseImportFile(file);

    expect(parsed.headers[0]).toBe("supplier sku");
    expect(parsed.rows[0]?.[5]).toBe("Premium plank, oak");
  });

  test("ignores blank rows in csv files", async () => {
    const file = buildFile({
      buffer: Buffer.from(
        "supplier sku,price basis,currency,base cost,effective date\n\nSUP-001,ROLL,GBP,12.5,2026-07-16\n\n",
      ),
    });

    const parsed = await parseImportFile(file);

    expect(parsed.rows).toHaveLength(1);
  });

  test("parses csv rows and preserves formula-like text as plain strings", async () => {
    const file = buildFile({
      buffer: Buffer.from(
        "supplier sku,price basis,currency,base cost,effective date,product name\nSUP-001,ROLL,GBP,12.5,2026-07-16,=Quoted label\n",
      ),
    });

    const parsed = await parseImportFile(file);

    expect(parsed.fileType).toBe(SupplierPriceImportFileType.CSV);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.[5]).toBe("=Quoted label");
  });

  test("rejects duplicate csv headers", async () => {
    const file = buildFile({
      buffer: Buffer.from(
        "supplier sku,supplier sku,price basis,currency,base cost,effective date\nSUP-001,SUP-001,ROLL,GBP,12.5,2026-07-16\n",
      ),
    });

    await expect(parseImportFile(file)).rejects.toThrow(
      "Duplicate header names are not supported in import files.",
    );
  });

  test("rejects files missing required pricing headers", async () => {
    const file = buildFile({
      buffer: Buffer.from("supplier sku,product code\nSUP-001,PROD-001\n"),
    });

    await expect(parseImportFile(file)).rejects.toThrow(
      "The import file is missing one or more required columns: base cost, price basis, currency, and effective date.",
    );
  });

  test("rejects files that exceed the row limit", async () => {
    const rows = [
      "supplier sku,price basis,currency,base cost,effective date",
      ...Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, index) =>
        `SUP-${index},ROLL,GBP,12.5,2026-07-16`,
      ),
    ].join("\n");

    await expect(parseImportFile(buildFile({ buffer: Buffer.from(rows) }))).rejects.toThrow(
      `Import rows exceed the maximum limit of ${IMPORT_MAX_ROWS}.`,
    );
  });

  test("rejects files that exceed the column limit", async () => {
    const headers = Array.from({ length: IMPORT_MAX_COLUMNS + 1 }, (_, index) => `header-${index}`);
    const file = buildFile({
      buffer: Buffer.from(`${headers.join(",")}\n${headers.join(",")}\n`),
    });

    await expect(parseImportFile(file)).rejects.toThrow(
      `Import columns exceed the maximum limit of ${IMPORT_MAX_COLUMNS}.`,
    );
  });

  test("rejects files with oversized cells", async () => {
    const longText = "x".repeat(IMPORT_MAX_CELL_LENGTH + 1);
    const file = buildFile({
      buffer: Buffer.from(
        `supplier sku,price basis,currency,base cost,effective date\n${longText},ROLL,GBP,12.5,2026-07-16\n`,
      ),
    });

    await expect(parseImportFile(file)).rejects.toThrow(
      `Import cell length exceeds the maximum allowed length of ${IMPORT_MAX_CELL_LENGTH}.`,
    );
  });

  test("parses xlsx using the mocked worksheet reader, supports sheet selection, and enforces worksheet limits", async () => {
    const readExcelModule = await import("read-excel-file/node");
    const readExcelMock = vi.mocked(readExcelModule.default);
    readExcelMock.mockResolvedValueOnce([
      {
        sheet: "Summary",
        data: [["ignored"]],
      },
      {
        sheet: "Pricing",
        data: [
          ["supplier sku", "price basis", "currency", "base cost", "effective date"],
          ["SUP-001", "ROLL", "GBP", 12.5, "2026-07-16"],
          ["SUP-002", "ROLL", "GBP", "=1+1", "2026-07-17"],
        ],
      },
    ] as unknown as never);

    const parsed = await parseImportFile(
      buildFile({
        originalname: "prices.xlsx",
        mimetype:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      { worksheetName: "Pricing" },
    );

    expect(parsed.fileType).toBe(SupplierPriceImportFileType.XLSX);
    expect(parsed.worksheetName).toBe("Pricing");
    expect(parsed.worksheetCount).toBe(2);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]?.[3]).toBe("=1+1");

    readExcelMock.mockResolvedValueOnce([
      {
        sheet: "Only Sheet",
        data: [["supplier sku", "price basis", "currency", "base cost", "effective date"]],
      },
    ] as unknown as never);

    await expect(
      parseImportFile(
        buildFile({
          originalname: "missing-sheet.xlsx",
          mimetype:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        { worksheetName: "Pricing" },
      ),
    ).rejects.toThrow('Worksheet "Pricing" was not found in the XLSX file.');

    readExcelMock.mockResolvedValueOnce(
      Array.from({ length: IMPORT_MAX_WORKSHEETS + 1 }, (_, index) => ({
        sheet: `Sheet ${index + 1}`,
        data: [["supplier sku", "price basis", "currency", "base cost", "effective date"]],
      })) as unknown as never,
    );

    await expect(
      parseImportFile(
        buildFile({
          originalname: "too-many-sheets.xlsx",
          mimetype:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ),
    ).rejects.toThrow(
      `Import worksheets exceed the maximum limit of ${IMPORT_MAX_WORKSHEETS}.`,
    );
  });

  test("uses an explicit header row number when supplied", async () => {
    const file = buildFile({
      buffer: Buffer.from(
        "Supplier pricing export\nPrepared 2026-07-16\nsupplier sku,price basis,currency,base cost,effective date\nSUP-001,ROLL,GBP,12.5,2026-07-16\n",
      ),
    });

    const parsed = await parseImportFile(file, { headerRowNumber: 3 });

    expect(parsed.headerRowNumber).toBe(3);
    expect(parsed.rows).toHaveLength(1);
  });

  test("normalizes rows and summarizes matched, unmatched, and duplicate states", () => {
    const rows = normalizeImportRows(
      [
        ["SUP-001", "ROLL", "GBP", "12.5", "2026-07-16"],
        ["SUP-001", "ROLL", "GBP", "12.5", "2026-07-16"],
        ["", "ROLL", "GBP", "12.5", "2026-07-16"],
      ],
      ["supplier sku", "price basis", "currency", "base cost", "effective date"],
      {
        supplierSku: "supplier sku",
        priceBasis: "price basis",
        currency: "currency",
        baseCost: "base cost",
        effectiveDate: "effective date",
      },
      undefined,
      {
        supplierProducts: [
          {
            id: "supplier-product-1",
            supplierSku: "SUP-001",
            productId: "product-1",
            variantId: null,
          },
        ],
        products: [],
        variants: [],
      },
    );

    const summary = summarizeNormalizedRows(rows);

    expect(rows[0]?.status).toBe("DUPLICATE");
    expect(rows[1]?.status).toBe("DUPLICATE");
    expect(rows[2]?.status).toBe("UNMATCHED");
    expect(summary.duplicateRowCount).toBe(2);
    expect(summary.unmatchedRowCount).toBe(1);
  });
});
