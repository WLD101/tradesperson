import { clientApiFetch } from "./client-api";
import type { SupplierPriceImportRecord } from "./suppliers";

export async function uploadSupplierPriceImport(
  supplierId: string,
  input: {
    file: File;
    priceListId?: string | null;
    worksheetName?: string | null;
    headerRowNumber?: number | null;
  },
) {
  const formData = new FormData();
  formData.append("file", input.file);
  if (input.priceListId) {
    formData.append("priceListId", input.priceListId);
  }
  if (input.worksheetName) {
    formData.append("worksheetName", input.worksheetName);
  }
  if (input.headerRowNumber != null) {
    formData.append("headerRowNumber", String(input.headerRowNumber));
  }

  return clientApiFetch<SupplierPriceImportRecord>(
    `/api/v1/suppliers/${supplierId}/price-imports`,
    {
      method: "POST",
      body: formData,
    },
  );
}
