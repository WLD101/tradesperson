"use client";

import Link from "next/link";
import { useState } from "react";
import { ClientApiError } from "@/lib/client-api";
import { uploadSupplierPriceImport } from "@/lib/supplier-price-import-client";
import type { SupplierPriceImportRecord } from "@/lib/suppliers";

type ImportPreviewRow = {
  rowNumber: number;
  supplierSku: string | null;
  productCode: string | null;
  variantCode: string | null;
  priceBasis: string | null;
  baseCost: string | null;
  currency: string | null;
  effectiveDate: string | null;
};

type Props = {
  supplierId: string;
  supplierName: string;
};

function normalizeCell(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function detectColumnIndex(headers: string[], patterns: string[]) {
  return headers.findIndex((header) =>
    patterns.some((pattern) => header.includes(pattern)),
  );
}

function mapRows(rows: string[][]) {
  if (!rows.length) {
    return [];
  }

  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => /sku|product|price|cost|currency|effective/i.test(cell ?? "")),
  );
  const safeHeaderIndex = headerIndex >= 0 ? headerIndex : 0;
  const headerRow = rows[safeHeaderIndex];
  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((cell) => String(cell).trim().toLowerCase());
  const dataRows = rows.slice(safeHeaderIndex + 1).filter((row) =>
    row.some((cell) => normalizeCell(cell) !== null),
  );

  const supplierSkuIndex = detectColumnIndex(headers, [
    "supplier sku",
    "supplier_sku",
    "sku",
  ]);
  const productCodeIndex = detectColumnIndex(headers, [
    "product code",
    "product sku",
    "product",
  ]);
  const variantCodeIndex = detectColumnIndex(headers, ["variant sku", "variant"]);
  const priceBasisIndex = detectColumnIndex(headers, ["price basis", "basis", "unit"]);
  const baseCostIndex = detectColumnIndex(headers, ["base cost", "cost", "price"]);
  const currencyIndex = detectColumnIndex(headers, ["currency"]);
  const effectiveDateIndex = detectColumnIndex(headers, [
    "effective date",
    "start date",
    "effective",
  ]);

  return dataRows.slice(0, 25).map((row, index) => ({
    rowNumber: safeHeaderIndex + index + 2,
    supplierSku: supplierSkuIndex >= 0 ? normalizeCell(row[supplierSkuIndex]) : null,
    productCode: productCodeIndex >= 0 ? normalizeCell(row[productCodeIndex]) : null,
    variantCode: variantCodeIndex >= 0 ? normalizeCell(row[variantCodeIndex]) : null,
    priceBasis: priceBasisIndex >= 0 ? normalizeCell(row[priceBasisIndex]) : null,
    baseCost: baseCostIndex >= 0 ? normalizeCell(row[baseCostIndex]) : null,
    currency: currencyIndex >= 0 ? normalizeCell(row[currencyIndex]) : null,
    effectiveDate:
      effectiveDateIndex >= 0 ? normalizeCell(row[effectiveDateIndex]) : null,
  }));
}

function formatError(error: unknown) {
  if (error instanceof ClientApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete the supplier price import.";
}

export function PriceImportPreview({ supplierId, supplierName }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [fileType, setFileType] = useState<"CSV" | "XLSX" | null>(null);
  const [serverImport, setServerImport] = useState<SupplierPriceImportRecord | null>(
    null,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <h2 className="text-lg font-semibold text-slate-950">Import preview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Parse `.csv` and `.xlsx` locally for {supplierName}, then submit the file
          into the persisted supplier pricing workflow.
        </p>
        <p className="mt-2 text-xs text-slate-500">Supplier ID: {supplierId}</p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5">
        <label className="block text-sm font-medium text-slate-700">
          Choose CSV or XLSX price file
        </label>
        <input
          type="file"
          accept=".csv,.xlsx"
          className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            setLoading(true);
            setError("");
            setRows([]);
            setServerImport(null);
            setSelectedFile(file);
            setFilename(file.name);

            try {
              const lowerName = file.name.toLowerCase();
              if (lowerName.endsWith(".csv")) {
                setFileType("CSV");
                const Papa = await import("papaparse");
                const text = await file.text();
                const parsed = Papa.parse(text, {
                  skipEmptyLines: true,
                });
                if (parsed.errors.length) {
                  throw new Error(parsed.errors[0]?.message ?? "Unable to parse CSV file.");
                }
                setRows(mapRows(parsed.data as string[][]));
              } else if (lowerName.endsWith(".xlsx")) {
                setFileType("XLSX");
                const readXlsxFile = (await import("read-excel-file/browser")).default;
                const parsed = (await readXlsxFile(file)) as unknown as unknown[][];
                setRows(
                  mapRows(
                    parsed.map((row) =>
                      row.map((cell: unknown) => String(cell ?? "")),
                    ),
                  ),
                );
              } else {
                throw new Error("Only .csv and .xlsx files are supported.");
              }
            } catch (previewError) {
              setError(formatError(previewError));
            } finally {
              setLoading(false);
            }
          }}
        />
        <p className="mt-3 text-xs text-slate-500">
          Supported columns: supplier SKU, product code, variant, price basis,
          base cost, currency, effective date.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 px-4 py-6 text-sm text-slate-500">
          Building local preview...
        </div>
      ) : null}

      {rows.length ? (
        <div className="space-y-3 rounded-xl border border-slate-200 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                Local preview
              </h3>
              <p className="text-sm text-slate-500">
                {filename} • {fileType} • showing {rows.length} parsed rows
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Non-authoritative
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p>
              Local preview is only a quick check. Validation, approval, and
              execution remain server-authoritative.
            </p>
            <button
              type="button"
              disabled={!selectedFile || uploading}
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={async () => {
                if (!selectedFile) {
                  return;
                }
                setUploading(true);
                setError("");
                try {
                  const uploaded = await uploadSupplierPriceImport(supplierId, {
                    file: selectedFile,
                  });
                  setServerImport(uploaded);
                } catch (uploadError) {
                  setError(formatError(uploadError));
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? "Uploading to server..." : "Create persisted import"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Supplier SKU</th>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Variant</th>
                  <th className="px-2 py-2">Basis</th>
                  <th className="px-2 py-2">Base cost</th>
                  <th className="px-2 py-2">Currency</th>
                  <th className="px-2 py-2">Effective date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-slate-200">
                    <td className="px-2 py-2 text-slate-500">{row.rowNumber}</td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.supplierSku ?? "Missing"}
                    </td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.productCode ?? "Missing"}
                    </td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.variantCode ?? "-"}
                    </td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.priceBasis ?? "Missing"}
                    </td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.baseCost ?? "Missing"}
                    </td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.currency ?? "Missing"}
                    </td>
                    <td className="px-2 py-2 text-slate-900">
                      {row.effectiveDate ?? "Missing"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {serverImport ? (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-emerald-950">
                Server parsed
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                Import `{serverImport.sourceFilename}` is persisted with status{" "}
                {serverImport.status}.
              </p>
            </div>
            <Link
              href={`/app/suppliers/${supplierId}/price-imports/${serverImport.id}`}
              className="rounded-md border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
            >
              Open import detail
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-4 text-sm text-emerald-900">
            <p>Total rows: {serverImport.rowCount}</p>
            <p>Valid rows: {serverImport.validRowCount}</p>
            <p>Invalid rows: {serverImport.invalidRowCount}</p>
            <p>Unmatched rows: {serverImport.unmatchedRowCount}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-sm text-emerald-900">
            <p>
              Detected headers:{" "}
              {serverImport.mappingSnapshot?.headers?.length
                ? serverImport.mappingSnapshot.headers.join(", ")
                : "No headers recorded"}
            </p>
            <p>
              Worksheet: {serverImport.worksheetName ?? "Default / first sheet"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
