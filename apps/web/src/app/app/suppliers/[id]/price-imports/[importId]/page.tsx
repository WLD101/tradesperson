import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import {
  fetchSupplierProductOptions,
  getSupplierPermissions,
  getSupplierPriceImport,
  listSupplierPriceImportMappings,
  listSupplierPriceImportRows,
  type SupplierDetail,
  type SupplierPriceImportRowRecord,
  type SupplierPriceImportRowStatus,
} from "@/lib/suppliers";

const rowStatusOptions: Array<{ label: string; value: string }> = [
  { label: "All statuses", value: "" },
  { label: "Valid", value: "VALID" },
  { label: "Invalid", value: "INVALID" },
  { label: "Unmatched", value: "UNMATCHED" },
  { label: "Duplicate", value: "DUPLICATE" },
  { label: "Imported", value: "IMPORTED" },
];

const matchStatusOptions = [
  { label: "All match states", value: "" },
  { label: "Matched", value: "MATCHED" },
  { label: "Unmatched", value: "UNMATCHED" },
  { label: "Manual", value: "MANUAL" },
  { label: "Supplier product ID", value: "SUPPLIER_PRODUCT_ID" },
  { label: "Supplier SKU", value: "SUPPLIER_SKU" },
  { label: "Product SKU", value: "PRODUCT_SKU" },
  { label: "Variant SKU", value: "VARIANT_SKU" },
] as const;

const executionStatusOptions = [
  { label: "All execution states", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Imported", value: "IMPORTED" },
] as const;

const sortOptions = [
  { label: "Row number ascending", value: "rowNumberAsc" },
  { label: "Row number descending", value: "rowNumberDesc" },
] as const;

const pageSizeOptions = [10, 25, 50, 100] as const;

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString();
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString();
}

function formatBytes(value: unknown) {
  const size = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return "Not persisted";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getStringParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function getPositiveInt(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRowQuery(params: {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  matchStatus?: string;
  executionStatus?: string;
  duplicateOnly?: boolean;
  hasWarnings?: boolean;
  sort?: string;
}) {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== 25) query.set("pageSize", String(params.pageSize));
  if (params.status) query.set("status", params.status);
  if (params.matchStatus) query.set("matchStatus", params.matchStatus);
  if (params.executionStatus) query.set("executionStatus", params.executionStatus);
  if (params.duplicateOnly) query.set("duplicateOnly", "true");
  if (params.hasWarnings) query.set("hasWarnings", "true");
  if (params.sort && params.sort !== "rowNumberAsc") query.set("sort", params.sort);
  return query.toString();
}

function isImportEditable(status: string) {
  return ["DRAFT", "FAILED", "REJECTED"].includes(status);
}

function rowHasIssues(row: SupplierPriceImportRowRecord) {
  return Boolean(row.errorMessages?.length || row.warningMessages?.length);
}

async function validateImport(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/price-imports/${importId}/validate`, {
    method: "POST",
  });
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
  revalidatePath(`/app/suppliers/${supplierId}/pricing`);
}

async function applySavedMapping(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  const mappingJson = String(formData.get("mappingJson"));
  const mappingName = String(formData.get("mappingName") || "");

  await apiFetch(`/api/v1/suppliers/${supplierId}/price-imports/${importId}/mapping`, {
    method: "PATCH",
    body: JSON.stringify({
      name: mappingName || null,
      mapping: JSON.parse(mappingJson),
    }),
  });
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
  revalidatePath(`/app/suppliers/${supplierId}/pricing`);
}

async function saveCurrentMapping(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  const mappingName = String(formData.get("mappingName"));
  const fileType = String(formData.get("fileType"));
  const mappingJson = String(formData.get("mappingJson"));

  await apiFetch(`/api/v1/suppliers/${supplierId}/price-import-mappings`, {
    method: "POST",
    body: JSON.stringify({
      name: mappingName,
      fileType,
      mapping: JSON.parse(mappingJson),
    }),
  });
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
}

async function manuallyMatchImportRow(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  const rowId = String(formData.get("rowId"));
  const supplierProductId = String(formData.get("supplierProductId") || "");
  const productId = String(formData.get("productId") || "");
  const variantId = String(formData.get("variantId") || "");

  await apiFetch(
    `/api/v1/suppliers/${supplierId}/price-imports/${importId}/rows/${rowId}/match`,
    {
      method: "PATCH",
      body: JSON.stringify({
        supplierProductId: supplierProductId || null,
        productId: supplierProductId ? null : productId || null,
        variantId: supplierProductId ? null : variantId || null,
      }),
    },
  );
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
}

async function approveImport(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/price-imports/${importId}/approve`, {
    method: "POST",
  });
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
  revalidatePath(`/app/suppliers/${supplierId}/pricing`);
}

async function executeImport(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/price-imports/${importId}/execute`, {
    method: "POST",
  });
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
  revalidatePath(`/app/suppliers/${supplierId}/pricing`);
}

async function cancelImport(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const importId = String(formData.get("importId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/price-imports/${importId}/cancel`, {
    method: "POST",
  });
  revalidatePath(`/app/suppliers/${supplierId}/price-imports/${importId}`);
  revalidatePath(`/app/suppliers/${supplierId}/pricing`);
}

export default async function SupplierPriceImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; importId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  if (!permissions.canImportPricing) {
    return notFound();
  }

  const { id, importId } = await params;
  const currentSearchParams = (await searchParams) ?? {};
  const search = getStringParam(currentSearchParams, "search");
  const status = getStringParam(currentSearchParams, "status");
  const matchStatus = getStringParam(currentSearchParams, "matchStatus");
  const executionStatus = getStringParam(currentSearchParams, "executionStatus");
  const duplicateOnly = getStringParam(currentSearchParams, "duplicateOnly") === "true";
  const hasWarnings = getStringParam(currentSearchParams, "hasWarnings") === "true";
  const sort = getStringParam(currentSearchParams, "sort") || "rowNumberAsc";
  const page = getPositiveInt(getStringParam(currentSearchParams, "page"), 1);
  const pageSize = getPositiveInt(getStringParam(currentSearchParams, "pageSize"), 25);

  const [supplier, importRecord, rowsResponse, savedMappings, productOptions] = await Promise.all([
    apiFetch<SupplierDetail>(`/api/v1/suppliers/${id}`),
    getSupplierPriceImport(id, importId),
    listSupplierPriceImportRows(id, importId, {
      ...(search ? { search } : {}),
      ...(status
        ? { status: status as SupplierPriceImportRowStatus }
        : {}),
      ...(matchStatus
        ? {
            matchStatus: matchStatus as
              | "MATCHED"
              | "UNMATCHED"
              | "MANUAL"
              | "SUPPLIER_PRODUCT_ID"
              | "SUPPLIER_SKU"
              | "PRODUCT_SKU"
              | "VARIANT_SKU",
          }
        : {}),
      ...(executionStatus
        ? { executionStatus: executionStatus as "PENDING" | "IMPORTED" }
        : {}),
      ...(duplicateOnly ? { duplicateOnly: true } : {}),
      ...(hasWarnings ? { hasWarnings: true } : {}),
      sort: sort === "rowNumberDesc" ? "rowNumberDesc" : "rowNumberAsc",
      page,
      pageSize,
    }),
    listSupplierPriceImportMappings(id),
    fetchSupplierProductOptions(),
  ]);

  const rows = rowsResponse.items;
  const validationSummary = importRecord.validationSummary ?? {};
  const editableImport = isImportEditable(importRecord.status);
  const createdVersionId =
    typeof validationSummary.createdVersionId === "string"
      ? validationSummary.createdVersionId
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/app/suppliers/${supplier.id}/pricing`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to supplier pricing
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Supplier import detail
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {supplier.tradingName ?? supplier.legalName} - {importRecord.sourceFilename}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/app/suppliers/${supplier.id}/price-imports/new`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            New import
          </Link>
          {createdVersionId && importRecord.priceListId ? (
            <Link
              href={`/app/suppliers/${supplier.id}/pricing/${importRecord.priceListId}?versionId=${createdVersionId}`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open created version
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Header</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplier
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {supplier.tradingName ?? supplier.legalName}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filename
              </p>
              <p className="mt-1 text-sm text-slate-900">{importRecord.sourceFilename}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                File type
              </p>
              <p className="mt-1 text-sm text-slate-900">{importRecord.fileType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                File size
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {formatBytes(validationSummary.fileSizeBytes)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Import status
              </p>
              <p className="mt-1 text-sm text-slate-900">{importRecord.status}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Worksheet
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {importRecord.worksheetName ?? "Default / first sheet"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created by
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {importRecord.createdById ?? "System"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created at
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {formatDate(importRecord.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Updated at
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {formatDate(importRecord.updatedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Header row
              </p>
              <p className="mt-1 text-sm text-slate-900">
                {importRecord.headerRowNumber ?? "Not set"}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Summary</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <p className="text-sm text-slate-700">Total rows: {importRecord.rowCount}</p>
            <p className="text-sm text-slate-700">Valid rows: {importRecord.validRowCount}</p>
            <p className="text-sm text-slate-700">
              Invalid rows: {importRecord.invalidRowCount}
            </p>
            <p className="text-sm text-slate-700">
              Warning rows: {importRecord.unmatchedRowCount + importRecord.duplicateRowCount}
            </p>
            <p className="text-sm text-slate-700">
              Duplicate rows: {importRecord.duplicateRowCount}
            </p>
            <p className="text-sm text-slate-700">
              Unmatched rows: {importRecord.unmatchedRowCount}
            </p>
            <p className="text-sm text-slate-700">
              Executed rows: {importRecord.importedRowCount}
            </p>
            <p className="text-sm text-slate-700">
              Parsed headers:{" "}
              {importRecord.mappingSnapshot?.headers?.length
                ? importRecord.mappingSnapshot.headers.length
                : 0}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Mapping</h2>
              <p className="mt-1 text-sm text-slate-500">
                Current detected source columns and the persisted target-field mapping.
              </p>
            </div>
            <p className="text-sm text-slate-500">{savedMappings.length} saved mappings</p>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source columns
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {importRecord.mappingSnapshot?.headers?.length ? (
                  importRecord.mappingSnapshot.headers.map((header) => (
                    <span
                      key={header}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {header}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No headers recorded.</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Target field</span>
                <span>Mapped source column</span>
              </div>
              {Object.entries(importRecord.mappingSnapshot?.columns ?? {}).length ? (
                Object.entries(importRecord.mappingSnapshot?.columns ?? {}).map(
                  ([field, column]) => (
                    <div
                      key={field}
                      className="grid grid-cols-2 gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                    >
                      <span className="font-medium text-slate-900">{field}</span>
                      <span className="text-slate-600">{column ?? "Not mapped"}</span>
                    </div>
                  ),
                )
              ) : (
                <div className="px-4 py-4 text-sm text-slate-500">No mapping persisted.</div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Saved mappings
              </p>
              <div className="mt-2 space-y-2">
                {savedMappings.length ? (
                  savedMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="rounded-lg border border-slate-200 px-3 py-3 text-sm"
                    >
                      <p className="font-medium text-slate-900">{mapping.name}</p>
                      <p className="mt-1 text-slate-500">
                        {mapping.fileType} - updated {formatDate(mapping.updatedAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No saved mappings for this supplier yet.</p>
                )}
              </div>
            </div>

            {editableImport && savedMappings.length ? (
              <form action={applySavedMapping} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Apply saved mapping
                </label>
                <select
                  name="mappingJson"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  defaultValue=""
                >
                  <option value="">Select saved mapping</option>
                  {savedMappings.map((mapping) => (
                    <option
                      key={mapping.id}
                      value={JSON.stringify(mapping.mappingJson)}
                    >
                      {mapping.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="mappingName" value="" />
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Apply mapping
                  </button>
                </div>
              </form>
            ) : null}

            {editableImport && importRecord.mappingSnapshot ? (
              <form action={saveCurrentMapping} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                <input type="hidden" name="fileType" value={importRecord.fileType} />
                <input
                  type="hidden"
                  name="mappingJson"
                  value={JSON.stringify(importRecord.mappingSnapshot)}
                />
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Save current mapping
                </label>
                <input
                  name="mappingName"
                  placeholder="Supplier default CSV mapping"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Save mapping
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Actions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Actions stay permission-aware and follow the current server lifecycle.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {permissions.canImportPricing &&
            ["DRAFT", "FAILED", "REJECTED"].includes(importRecord.status) ? (
              <form action={validateImport}>
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                <button
                  type="submit"
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Validate
                </button>
              </form>
            ) : null}

            {permissions.canApprovePricing && importRecord.status === "VALIDATED" ? (
              <form action={approveImport}>
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                <button
                  type="submit"
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Approve
                </button>
              </form>
            ) : null}

            {permissions.canApprovePricing && importRecord.status === "APPROVED" ? (
              <form action={executeImport}>
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                <button
                  type="submit"
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                >
                  Execute
                </button>
              </form>
            ) : null}

            {importRecord.status === "EXECUTING" ? (
              <div className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500">
                Execution in progress
              </div>
            ) : null}

            {permissions.canImportPricing &&
            !["APPROVED", "EXECUTING", "EXECUTED", "ARCHIVED"].includes(importRecord.status) ? (
              <form action={cancelImport}>
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="importId" value={importRecord.id} />
                <button
                  type="submit"
                  className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50"
                >
                  Cancel
                </button>
              </form>
            ) : null}

            <Link
              href={`/app/suppliers/${supplier.id}/pricing`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Return to pricing
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p>Current lifecycle: {importRecord.status}</p>
            <p className="mt-2">
              Approved imports are server-locked against remapping, and executed
              imports retain the created version reference in the persisted summary.
            </p>
            {createdVersionId ? (
              <p className="mt-2">Created version ID: {createdVersionId}</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Import rows</h2>
            <p className="mt-1 text-sm text-slate-500">
              Inspect persisted rows with server-driven search, filters, sorting, and pagination.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {rowsResponse.total} matching rows across {rowsResponse.totalPages} pages
          </p>
        </div>

        <form method="get" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search SKU, product, variant, or row"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {rowStatusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="matchStatus"
            defaultValue={matchStatus}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {matchStatusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="executionStatus"
            defaultValue={executionStatus}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {executionStatusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="pageSize"
            defaultValue={String(pageSize)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} rows
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="duplicateOnly" value="true" defaultChecked={duplicateOnly} />
            Duplicate only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="hasWarnings" value="true" defaultChecked={hasWarnings} />
            Warnings only
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Apply filters
            </button>
            <Link
              href={`/app/suppliers/${supplier.id}/price-imports/${importRecord.id}`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            Filtered rows: {rowsResponse.summary.rowCount}
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            Valid: {rowsResponse.summary.validRowCount}
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            Invalid: {rowsResponse.summary.invalidRowCount}
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            Unmatched: {rowsResponse.summary.unmatchedRowCount}
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            Duplicates: {rowsResponse.summary.duplicateRowCount}
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
            Warnings: {rowsResponse.summary.warningRowCount}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-3">Row</th>
                <th className="px-2 py-3">Supplier SKU</th>
                <th className="px-2 py-3">Product code</th>
                <th className="px-2 py-3">Product name</th>
                <th className="px-2 py-3">Variant SKU</th>
                <th className="px-2 py-3">Unit</th>
                <th className="px-2 py-3">Price basis</th>
                <th className="px-2 py-3">Currency</th>
                <th className="px-2 py-3">Cost</th>
                <th className="px-2 py-3">Effective date</th>
                <th className="px-2 py-3">Match status</th>
                <th className="px-2 py-3">Validation status</th>
                <th className="px-2 py-3">Errors / warnings</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row: SupplierPriceImportRowRecord) => {
                  const errors = row.errorMessages?.map((item) => item.message) ?? [];
                  const warnings = row.warningMessages?.map((item) => item.message) ?? [];
                  const showManualMatch =
                    editableImport &&
                    row.normalizedData?.matchMethod === "UNMATCHED" &&
                    row.status === "UNMATCHED";
                  return (
                    <tr key={row.id} className="border-b border-slate-100 align-top">
                      <td className="px-2 py-3 text-slate-500">{row.rowNumber}</td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.supplierSku ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.productSku ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.productName ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.variantSku ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.unit ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.priceBasis ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.currency ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.baseCost ?? "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {formatDateOnly(row.normalizedData?.effectiveDate)}
                      </td>
                      <td className="px-2 py-3 text-slate-900">
                        {row.normalizedData?.matchMethod ?? "UNMATCHED"}
                      </td>
                      <td className="px-2 py-3 text-slate-900">{row.status}</td>
                      <td className="px-2 py-3 text-slate-600">
                        <div className="space-y-2">
                          {errors.length ? (
                            <p className="text-rose-700">Errors: {errors.join("; ")}</p>
                          ) : null}
                          {warnings.length ? (
                            <p className="text-amber-700">Warnings: {warnings.join("; ")}</p>
                          ) : null}
                          {!errors.length && !warnings.length ? <p>No issues</p> : null}
                          {showManualMatch ? (
                            <form action={manuallyMatchImportRow} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <input type="hidden" name="supplierId" value={supplier.id} />
                              <input type="hidden" name="importId" value={importRecord.id} />
                              <input type="hidden" name="rowId" value={row.id} />
                              <select
                                name="supplierProductId"
                                defaultValue=""
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                              >
                                <option value="">Match to supplier product</option>
                                {supplier.supplierProducts.map((supplierProduct) => (
                                  <option key={supplierProduct.id} value={supplierProduct.id}>
                                    {supplierProduct.supplierSku} - {supplierProduct.product.name}
                                    {supplierProduct.variant ? ` / ${supplierProduct.variant.name}` : ""}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="productId"
                                defaultValue=""
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                              >
                                <option value="">Or match to product</option>
                                {productOptions.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                  </option>
                                ))}
                              </select>
                              <select
                                name="variantId"
                                defaultValue=""
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                              >
                                <option value="">Optional variant</option>
                                {productOptions.flatMap((product) =>
                                  product.variants.map((variant) => (
                                    <option key={variant.id} value={variant.id}>
                                      {product.name} - {variant.name} ({variant.sku})
                                    </option>
                                  )),
                                )}
                              </select>
                              <button
                                type="submit"
                                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                              >
                                Save manual match
                              </button>
                            </form>
                          ) : null}
                          {editableImport && rowHasIssues(row) && !showManualMatch ? (
                            <p className="text-xs text-slate-500">
                              Fix the mapping or row values, then revalidate before approval.
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="px-2 py-10 text-center text-sm text-slate-500">
                    No rows matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Page {rowsResponse.page} of {rowsResponse.totalPages}
          </p>
          <div className="flex gap-3">
            {rowsResponse.page > 1 ? (
              <Link
                href={`/app/suppliers/${supplier.id}/price-imports/${importRecord.id}?${buildRowQuery({
                  search,
                  page: rowsResponse.page - 1,
                  pageSize,
                  status,
                  matchStatus,
                  executionStatus,
                  duplicateOnly,
                  hasWarnings,
                  sort,
                })}`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Previous
              </Link>
            ) : null}
            {rowsResponse.page < rowsResponse.totalPages ? (
              <Link
                href={`/app/suppliers/${supplier.id}/price-imports/${importRecord.id}?${buildRowQuery({
                  search,
                  page: rowsResponse.page + 1,
                  pageSize,
                  status,
                  matchStatus,
                  executionStatus,
                  duplicateOnly,
                  hasWarnings,
                  sort,
                })}`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
