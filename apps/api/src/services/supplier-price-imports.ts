import { BadRequestException } from "@nestjs/common";
import {
  SupplierPriceBasis,
  SupplierPriceImportFileType,
  SupplierPriceImportRowStatus,
} from "@prisma/client";
import Papa from "papaparse";

export const IMPORT_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5_000;
export const IMPORT_MAX_COLUMNS = 100;
export const IMPORT_MAX_CELL_LENGTH = 10_000;
export const IMPORT_MAX_WORKSHEETS = 5;
export const SUPPORTED_IMPORT_EXTENSIONS = [".csv", ".xlsx"] as const;
export const SUPPORTED_IMPORT_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type ImportUploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type ImportColumnMapping = Partial<Record<ImportField, string | null>>;

export type ImportRowOverride = {
  supplierProductId?: string | null;
  productId?: string | null;
  variantId?: string | null;
};

export type ImportMappingSnapshot = {
  columns: ImportColumnMapping;
  headers: string[];
  rowOverrides?: Record<string, ImportRowOverride>;
};

export type ParsedImportFile = {
  fileType: SupplierPriceImportFileType;
  worksheetName: string | null;
  worksheetCount: number;
  headerRowNumber: number;
  headers: string[];
  rows: string[][];
  mapping: ImportColumnMapping;
};

export type ParseImportFileOptions = {
  worksheetName?: string | null;
  headerRowNumber?: number | null;
};

export type ImportField =
  | "supplierSku"
  | "supplierProductId"
  | "productSku"
  | "productName"
  | "variantSku"
  | "unit"
  | "priceBasis"
  | "currency"
  | "baseCost"
  | "packCost"
  | "rollCost"
  | "areaCost"
  | "quantityFrom"
  | "quantityTo"
  | "minimumOrderQty"
  | "effectiveDate"
  | "expiryDate"
  | "promotionalCost"
  | "promotionStart"
  | "promotionEnd"
  | "taxTreatmentCode";

export type NormalizedImportRow = {
  rowNumber: number;
  status: SupplierPriceImportRowStatus;
  duplicateKey: string | null;
  rawData: Record<string, string | null>;
  normalizedData: {
    supplierSku: string | null;
    supplierProductId: string | null;
    productSku: string | null;
    productName: string | null;
    variantSku: string | null;
    unit: string | null;
    priceBasis: SupplierPriceBasis | null;
    currency: string | null;
    baseCost: string | null;
    packCost: string | null;
    rollCost: string | null;
    areaCost: string | null;
    quantityFrom: string | null;
    quantityTo: string | null;
    minimumOrderQty: string | null;
    effectiveDate: string | null;
    expiryDate: string | null;
    promotionalCost: string | null;
    promotionStart: string | null;
    promotionEnd: string | null;
    taxTreatmentCode: string | null;
    matchMethod: "SUPPLIER_PRODUCT_ID" | "SUPPLIER_SKU" | "PRODUCT_SKU" | "VARIANT_SKU" | "MANUAL" | "UNMATCHED";
    executionStatus: "PENDING" | "IMPORTED";
    createdPriceId: string | null;
  };
  errorMessages: Array<{ code: string; field: string; message: string; severity: "error" }>;
  warningMessages: Array<{ code: string; field: string; message: string; severity: "warning" }>;
  matched: {
    supplierProductId: string | null;
    productId: string | null;
    variantId: string | null;
  };
};

type MatchContext = {
  supplierProducts: Array<{
    id: string;
    supplierSku: string;
    productId: string;
    variantId: string | null;
  }>;
  products: Array<{
    id: string;
    sku: string;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    productId: string;
  }>;
};

const IMPORT_FIELD_PATTERNS: Array<[ImportField, string[]]> = [
  ["supplierSku", ["supplier sku", "supplier_sku", "sku"]],
  ["supplierProductId", ["supplier product id", "supplier_product_id"]],
  ["productSku", ["product code", "product sku", "product_code"]],
  ["productName", ["product name", "name"]],
  ["variantSku", ["variant sku", "variant"]],
  ["unit", ["unit", "uom"]],
  ["priceBasis", ["price basis", "basis"]],
  ["currency", ["currency"]],
  ["baseCost", ["base cost", "cost", "price"]],
  ["packCost", ["pack cost"]],
  ["rollCost", ["roll cost"]],
  ["areaCost", ["area cost", "sqm cost", "m2 cost"]],
  ["quantityFrom", ["quantity from", "qty from", "break from"]],
  ["quantityTo", ["quantity to", "qty to", "break to"]],
  ["minimumOrderQty", ["minimum order", "min qty"]],
  ["effectiveDate", ["effective date", "start date"]],
  ["expiryDate", ["expiry date", "end date"]],
  ["promotionalCost", ["promotion cost", "promo cost", "promotion price"]],
  ["promotionStart", ["promotion start", "promo start"]],
  ["promotionEnd", ["promotion end", "promo end"]],
  ["taxTreatmentCode", ["tax", "vat code", "tax code"]],
];

const SUPPORTED_PRICE_BASES = new Set<SupplierPriceBasis>([
  SupplierPriceBasis.EACH,
  SupplierPriceBasis.METRE,
  SupplierPriceBasis.SQUARE_METRE,
  SupplierPriceBasis.LINEAR_METRE,
  SupplierPriceBasis.PACK,
  SupplierPriceBasis.ROLL,
  SupplierPriceBasis.TUB,
  SupplierPriceBasis.BAG,
  SupplierPriceBasis.BOX,
  SupplierPriceBasis.PAIR,
  SupplierPriceBasis.SET,
]);

export function assertSupportedImportFile(file: ImportUploadFile) {
  const lower = file.originalname.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isXlsx = lower.endsWith(".xlsx");
  if (!isCsv && !isXlsx) {
    throw new BadRequestException("Only CSV and XLSX files are supported.");
  }
  if (
    file.mimetype &&
    !SUPPORTED_IMPORT_MIME_TYPES.includes(file.mimetype as (typeof SUPPORTED_IMPORT_MIME_TYPES)[number])
  ) {
    throw new BadRequestException("Unsupported import file content type.");
  }

  if (file.size > IMPORT_FILE_SIZE_LIMIT_BYTES) {
    throw new BadRequestException("Import file exceeds the 5MB size limit.");
  }

  return isCsv ? SupplierPriceImportFileType.CSV : SupplierPriceImportFileType.XLSX;
}

export async function parseImportFile(
  file: ImportUploadFile,
  options: ParseImportFileOptions = {},
) {
  const fileType = assertSupportedImportFile(file);
  if (fileType === SupplierPriceImportFileType.CSV) {
    return parseCsvFile(file, options);
  }

  return parseXlsxFile(file, options);
}

export function normalizeImportRows(
  rows: string[][],
  headers: string[],
  mapping: ImportColumnMapping,
  rowOverrides: Record<string, ImportRowOverride> | undefined,
  context: MatchContext,
  firstDataRowNumber = 2,
) {
  const normalizedRows = rows.map((row, index) =>
    normalizeImportRow(
      firstDataRowNumber + index,
      headers,
      row,
      mapping,
      rowOverrides,
      context,
    ),
  );
  applyDuplicateKeys(normalizedRows);
  return normalizedRows;
}

export function summarizeNormalizedRows(rows: NormalizedImportRow[]) {
  return {
    rowCount: rows.length,
    validRowCount: rows.filter((row) => row.status === SupplierPriceImportRowStatus.VALID).length,
    invalidRowCount: rows.filter((row) => row.status === SupplierPriceImportRowStatus.INVALID).length,
    unmatchedRowCount: rows.filter((row) => row.status === SupplierPriceImportRowStatus.UNMATCHED).length,
    duplicateRowCount: rows.filter((row) => row.status === SupplierPriceImportRowStatus.DUPLICATE).length,
  };
}

function parseCsvFile(
  file: ImportUploadFile,
  options: ParseImportFileOptions,
): ParsedImportFile {
  const text = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
  const parsed = Papa.parse(text, {
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    throw new BadRequestException(parsed.errors[0]?.message ?? "Unable to parse CSV import.");
  }

  const rows = sanitizeRows(parsed.data);
  return buildParsedImport(file, SupplierPriceImportFileType.CSV, rows, null, 1, options);
}

async function parseXlsxFile(
  file: ImportUploadFile,
  options: ParseImportFileOptions,
): Promise<ParsedImportFile> {
  const mod = await import("read-excel-file/node");
  const sheets = (await mod.default(file.buffer as unknown as never)) as Array<{
    sheet: string;
    data: unknown[][];
  }>;
  if (sheets.length > IMPORT_MAX_WORKSHEETS) {
    throw new BadRequestException(
      `Import worksheets exceed the maximum limit of ${IMPORT_MAX_WORKSHEETS}.`,
    );
  }
  const selectedSheet = options.worksheetName
    ? sheets.find((sheet) => sheet.sheet === options.worksheetName)
    : sheets[0];
  if (!selectedSheet) {
    throw new BadRequestException(
      options.worksheetName
        ? `Worksheet "${options.worksheetName}" was not found in the XLSX file.`
        : "The XLSX file did not contain any worksheets.",
    );
  }
  if (!selectedSheet.data) {
    throw new BadRequestException("The XLSX file did not contain any worksheets.");
  }

  const rows = sanitizeRows(
    selectedSheet.data.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
  );
  return buildParsedImport(
    file,
    SupplierPriceImportFileType.XLSX,
    rows,
    selectedSheet.sheet,
    sheets.length,
    options,
  );
}

function buildParsedImport(
  file: ImportUploadFile,
  fileType: SupplierPriceImportFileType,
  rows: string[][],
  worksheetName: string | null,
  worksheetCount: number,
  options: ParseImportFileOptions,
): ParsedImportFile {
  if (!rows.length) {
    throw new BadRequestException("The uploaded file did not contain any rows.");
  }
  if (rows.length > IMPORT_MAX_ROWS + 1) {
    throw new BadRequestException(`Import rows exceed the maximum limit of ${IMPORT_MAX_ROWS}.`);
  }

  const requestedHeaderIndex =
    options.headerRowNumber && options.headerRowNumber > 0
      ? options.headerRowNumber - 1
      : null;
  const headerIndex =
    requestedHeaderIndex ??
    rows.findIndex((row) =>
      row.some((cell) => /sku|product|price|cost|currency|effective/i.test(cell)),
    );
  const safeHeaderIndex = headerIndex >= 0 ? headerIndex : 0;
  const headerRow = rows[safeHeaderIndex] ?? [];
  if (headerRow.length > IMPORT_MAX_COLUMNS) {
    throw new BadRequestException(`Import columns exceed the maximum limit of ${IMPORT_MAX_COLUMNS}.`);
  }

  const headers = headerRow.map((cell) => cell.trim());
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) {
    throw new BadRequestException("Duplicate header names are not supported in import files.");
  }
  const mapping = detectImportMapping(headers);
  const dataRows = rows
    .slice(safeHeaderIndex + 1)
    .filter((row) => row.some((cell) => cell.trim() !== ""));

  if (!mapping.baseCost || !mapping.priceBasis || !mapping.currency || !mapping.effectiveDate) {
    throw new BadRequestException(
      "The import file is missing one or more required columns: base cost, price basis, currency, and effective date.",
    );
  }

  return {
    fileType,
    worksheetName,
    worksheetCount,
    headerRowNumber: safeHeaderIndex + 1,
    headers,
    rows: dataRows,
    mapping,
  };
}

function sanitizeRows(rows: string[][]) {
  return rows.map((row) =>
    row.map((cell) => {
      const value = String(cell ?? "").trim();
      const sanitized = value.replace(/^\uFEFF/, "");
      if (sanitized.length > IMPORT_MAX_CELL_LENGTH) {
        throw new BadRequestException(
          `Import cell length exceeds the maximum allowed length of ${IMPORT_MAX_CELL_LENGTH}.`,
        );
      }
      return sanitized;
    }),
  );
}

function detectImportMapping(headers: string[]): ImportColumnMapping {
  const normalizedHeaders = headers.map((header) => header.toLowerCase());
  const mapping: ImportColumnMapping = {};

  for (const [field, patterns] of IMPORT_FIELD_PATTERNS) {
    const matchedIndex = normalizedHeaders.findIndex((header) =>
      patterns.some((pattern) => header.includes(pattern)),
    );
    if (matchedIndex >= 0) {
      mapping[field] = headers[matchedIndex] ?? null;
    }
  }

  return mapping;
}

function normalizeImportRow(
  rowNumber: number,
  headers: string[],
  row: string[],
  mapping: ImportColumnMapping,
  rowOverrides: Record<string, ImportRowOverride> | undefined,
  context: MatchContext,
): NormalizedImportRow {
  const rawData = Object.fromEntries(
    headers.map((header, index) => [header, normalizeCell(row[index])]),
  );
  const override = rowOverrides?.[String(rowNumber)] ?? null;

  const supplierSku = getMappedValue(rawData, mapping.supplierSku);
  const supplierProductId = getMappedValue(rawData, mapping.supplierProductId);
  const productSku = getMappedValue(rawData, mapping.productSku);
  const productName = getMappedValue(rawData, mapping.productName);
  const variantSku = getMappedValue(rawData, mapping.variantSku);
  const priceBasis = normalizePriceBasis(getMappedValue(rawData, mapping.priceBasis));
  const currency = normalizeCurrency(getMappedValue(rawData, mapping.currency));
  const baseCost = normalizeDecimal(getMappedValue(rawData, mapping.baseCost));
  const packCost = normalizeDecimal(getMappedValue(rawData, mapping.packCost));
  const rollCost = normalizeDecimal(getMappedValue(rawData, mapping.rollCost));
  const areaCost = normalizeDecimal(getMappedValue(rawData, mapping.areaCost));
  const quantityFrom = normalizeDecimal(getMappedValue(rawData, mapping.quantityFrom));
  const quantityTo = normalizeDecimal(getMappedValue(rawData, mapping.quantityTo));
  const minimumOrderQty = normalizeDecimal(getMappedValue(rawData, mapping.minimumOrderQty));
  const effectiveDate = normalizeDate(getMappedValue(rawData, mapping.effectiveDate));
  const expiryDate = normalizeDate(getMappedValue(rawData, mapping.expiryDate));
  const promotionalCost = normalizeDecimal(getMappedValue(rawData, mapping.promotionalCost));
  const promotionStart = normalizeDate(getMappedValue(rawData, mapping.promotionStart));
  const promotionEnd = normalizeDate(getMappedValue(rawData, mapping.promotionEnd));
  const taxTreatmentCode = getMappedValue(rawData, mapping.taxTreatmentCode);

  const errors: NormalizedImportRow["errorMessages"] = [];
  const warnings: NormalizedImportRow["warningMessages"] = [];

  if (!priceBasis) {
    errors.push({ code: "PRICE_BASIS_REQUIRED", field: "priceBasis", message: "Price basis is required.", severity: "error" });
  }
  if (!currency) {
    errors.push({ code: "CURRENCY_REQUIRED", field: "currency", message: "Currency is required.", severity: "error" });
  }
  if (!baseCost) {
    errors.push({ code: "BASE_COST_REQUIRED", field: "baseCost", message: "Base cost is required.", severity: "error" });
  }
  if (!effectiveDate) {
    errors.push({ code: "EFFECTIVE_DATE_REQUIRED", field: "effectiveDate", message: "Effective date is required.", severity: "error" });
  }
  if (expiryDate && effectiveDate && expiryDate < effectiveDate) {
    errors.push({ code: "EXPIRY_BEFORE_EFFECTIVE", field: "expiryDate", message: "Expiry date must be after the effective date.", severity: "error" });
  }
  if (promotionEnd && promotionStart && promotionEnd < promotionStart) {
    errors.push({ code: "PROMOTION_RANGE_INVALID", field: "promotionEnd", message: "Promotion end date must be after promotion start date.", severity: "error" });
  }

  const matched = resolveImportMatch(
    {
      supplierProductId,
      supplierSku,
      productSku,
      variantSku,
      override,
    },
    context,
  );

  if (!matched.supplierProductId && !matched.productId && !matched.variantId) {
    warnings.push({
      code: "UNMATCHED_ROW",
      field: "supplierSku",
      message: "Row could not be matched to an existing supplier product, product, or variant.",
      severity: "warning",
    });
  }

  const status =
    errors.length > 0
      ? SupplierPriceImportRowStatus.INVALID
      : matched.matchMethod === "UNMATCHED"
        ? SupplierPriceImportRowStatus.UNMATCHED
        : SupplierPriceImportRowStatus.VALID;

  return {
    rowNumber,
    status,
    duplicateKey: null,
    rawData,
    normalizedData: {
      supplierSku,
      supplierProductId,
      productSku,
      productName,
      variantSku,
      unit: getMappedValue(rawData, mapping.unit),
      priceBasis,
      currency,
      baseCost,
      packCost,
      rollCost,
      areaCost,
      quantityFrom,
      quantityTo,
      minimumOrderQty,
      effectiveDate,
      expiryDate,
      promotionalCost,
      promotionStart,
      promotionEnd,
      taxTreatmentCode,
      matchMethod: matched.matchMethod,
      executionStatus: "PENDING",
      createdPriceId: null,
    },
    errorMessages: errors,
    warningMessages: warnings,
    matched: {
      supplierProductId: matched.supplierProductId,
      productId: matched.productId,
      variantId: matched.variantId,
    },
  };
}

function resolveImportMatch(
  input: {
    supplierProductId: string | null;
    supplierSku: string | null;
    productSku: string | null;
    variantSku: string | null;
    override: ImportRowOverride | null;
  },
  context: MatchContext,
) {
  if (input.override?.supplierProductId) {
    const supplierProduct = context.supplierProducts.find(
      (record) => record.id === input.override?.supplierProductId,
    );
    if (supplierProduct) {
      return {
        supplierProductId: supplierProduct.id,
        productId: supplierProduct.productId,
        variantId: supplierProduct.variantId,
        matchMethod: "MANUAL" as const,
      };
    }
  }

  if (input.supplierProductId) {
    const supplierProduct = context.supplierProducts.find(
      (record) => record.id === input.supplierProductId,
    );
    if (supplierProduct) {
      return {
        supplierProductId: supplierProduct.id,
        productId: supplierProduct.productId,
        variantId: supplierProduct.variantId,
        matchMethod: "SUPPLIER_PRODUCT_ID" as const,
      };
    }
  }

  if (input.supplierSku) {
    const supplierProduct = context.supplierProducts.find(
      (record) => record.supplierSku.toLowerCase() === input.supplierSku?.toLowerCase(),
    );
    if (supplierProduct) {
      return {
        supplierProductId: supplierProduct.id,
        productId: supplierProduct.productId,
        variantId: supplierProduct.variantId,
        matchMethod: "SUPPLIER_SKU" as const,
      };
    }
  }

  if (input.productSku) {
    const product = context.products.find(
      (record) => record.sku.toLowerCase() === input.productSku?.toLowerCase(),
    );
    if (product) {
      return {
        supplierProductId: null,
        productId: product.id,
        variantId: null,
        matchMethod: "PRODUCT_SKU" as const,
      };
    }
  }

  if (input.variantSku) {
    const variant = context.variants.find(
      (record) => record.sku.toLowerCase() === input.variantSku?.toLowerCase(),
    );
    if (variant) {
      return {
        supplierProductId: null,
        productId: variant.productId,
        variantId: variant.id,
        matchMethod: "VARIANT_SKU" as const,
      };
    }
  }

  return {
    supplierProductId: null,
    productId: null,
    variantId: null,
    matchMethod: "UNMATCHED" as const,
  };
}

function applyDuplicateKeys(rows: NormalizedImportRow[]) {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = [
      row.matched.supplierProductId ?? row.normalizedData.supplierSku ?? "",
      row.normalizedData.priceBasis ?? "",
      row.normalizedData.currency ?? "",
      row.normalizedData.effectiveDate ?? "",
      row.normalizedData.quantityFrom ?? "",
      row.normalizedData.quantityTo ?? "",
    ].join("|");
    row.duplicateKey = key;

    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
  }

  for (const row of rows) {
    if (!row.duplicateKey) {
      continue;
    }
    if ((seen.get(row.duplicateKey) ?? 0) > 1 && row.status === SupplierPriceImportRowStatus.VALID) {
      row.status = SupplierPriceImportRowStatus.DUPLICATE;
      row.warningMessages.push({
        code: "DUPLICATE_ROW",
        field: "supplierSku",
        message: "Duplicate supplier pricing row detected in the import file.",
        severity: "warning",
      });
    }
  }
}

function getMappedValue(
  rawData: Record<string, string | null>,
  header: string | null | undefined,
) {
  if (!header) {
    return null;
  }
  return normalizeCell(rawData[header] ?? null);
}

function normalizeCell(value: string | null | undefined) {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCurrency(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizePriceBasis(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  return SUPPORTED_PRICE_BASES.has(normalized as SupplierPriceBasis)
    ? (normalized as SupplierPriceBasis)
    : null;
}

function normalizeDecimal(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.replaceAll(",", "");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return numeric.toFixed(4);
}

function normalizeDate(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
