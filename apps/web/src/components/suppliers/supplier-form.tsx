"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, Input } from "@tradesperson/ui";
import { ClientApiError, clientApiFetch } from "@/lib/client-api";
import type { SupplierDetail } from "@/lib/suppliers";

type SupplierFormValues = {
  legalName: string;
  tradingName?: string;
  supplierCode: string;
  accountNumber?: string;
  companyRegistrationNumber?: string;
  vatRegistrationNumber?: string;
  email?: string;
  telephone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  countryCode?: string;
  paymentTermsDescription?: string;
  creditLimit?: string;
  defaultCurrency?: string;
  typicalLeadTimeDays?: string;
  minimumOrderNotes?: string;
  deliveryNotes?: string;
  returnPolicyNotes?: string;
  internalNotes?: string;
  preferredSupplier: boolean;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
};

type Props = {
  mode: "create" | "edit";
  supplier?: SupplierDetail;
};

function formatError(error: unknown) {
  if (error instanceof ClientApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

function normalizeOptional(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

export function SupplierForm({ mode, supplier }: Props) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit } = useForm<SupplierFormValues>({
    defaultValues: {
      legalName: supplier?.legalName ?? "",
      tradingName: supplier?.tradingName ?? "",
      supplierCode: supplier?.supplierCode ?? "",
      accountNumber: supplier?.accountNumber ?? "",
      companyRegistrationNumber: supplier?.companyRegistrationNumber ?? "",
      vatRegistrationNumber: supplier?.vatRegistrationNumber ?? "",
      email: supplier?.email ?? "",
      telephone: supplier?.telephone ?? "",
      website: supplier?.website ?? "",
      addressLine1: supplier?.addressLine1 ?? "",
      addressLine2: supplier?.addressLine2 ?? "",
      city: supplier?.city ?? "",
      county: supplier?.county ?? "",
      postcode: supplier?.postcode ?? "",
      countryCode: supplier?.countryCode ?? "GB",
      paymentTermsDescription: supplier?.paymentTermsDescription ?? "",
      creditLimit: supplier?.creditLimit ?? "",
      defaultCurrency: supplier?.defaultCurrency ?? "GBP",
      typicalLeadTimeDays: supplier?.typicalLeadTimeDays?.toString() ?? "",
      minimumOrderNotes: supplier?.minimumOrderNotes ?? "",
      deliveryNotes: supplier?.deliveryNotes ?? "",
      returnPolicyNotes: supplier?.returnPolicyNotes ?? "",
      internalNotes: supplier?.internalNotes ?? "",
      preferredSupplier: supplier?.preferredSupplier ?? false,
      status: supplier?.status ?? "ACTIVE",
    },
  });

  return (
    <Card>
      <div>
        <h1 className="text-xl font-semibold text-slate-950">
          {mode === "create" ? "New supplier" : "Edit supplier"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Functional supplier administration first. Price lists remain a later phase.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <form
        className="mt-6 grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          setSaving(true);
          setError("");
          setSuccess("");

          try {
            const payload = {
              legalName: values.legalName.trim(),
              tradingName: normalizeOptional(values.tradingName),
              supplierCode: values.supplierCode.trim(),
              accountNumber: normalizeOptional(values.accountNumber),
              companyRegistrationNumber: normalizeOptional(
                values.companyRegistrationNumber,
              ),
              vatRegistrationNumber: normalizeOptional(
                values.vatRegistrationNumber,
              ),
              email: normalizeOptional(values.email),
              telephone: normalizeOptional(values.telephone),
              website: normalizeOptional(values.website),
              addressLine1: normalizeOptional(values.addressLine1),
              addressLine2: normalizeOptional(values.addressLine2),
              city: normalizeOptional(values.city),
              county: normalizeOptional(values.county),
              postcode: normalizeOptional(values.postcode),
              countryCode: values.countryCode?.trim() || "GB",
              paymentTermsDescription: normalizeOptional(
                values.paymentTermsDescription,
              ),
              creditLimit: values.creditLimit?.trim()
                ? Number(values.creditLimit)
                : null,
              defaultCurrency: values.defaultCurrency?.trim() || "GBP",
              typicalLeadTimeDays: values.typicalLeadTimeDays?.trim()
                ? Number(values.typicalLeadTimeDays)
                : null,
              minimumOrderNotes: normalizeOptional(values.minimumOrderNotes),
              deliveryNotes: normalizeOptional(values.deliveryNotes),
              returnPolicyNotes: normalizeOptional(values.returnPolicyNotes),
              internalNotes: normalizeOptional(values.internalNotes),
              preferredSupplier: values.preferredSupplier,
              status: values.status,
            };

            if (mode === "create") {
              await clientApiFetch("/api/v1/suppliers", {
                method: "POST",
                body: JSON.stringify(payload),
              });
              setSuccess("Supplier created.");
            } else {
              await clientApiFetch(`/api/v1/suppliers/${supplier?.id}`, {
                method: "PATCH",
                body: JSON.stringify(payload),
              });
              setSuccess("Supplier updated.");
            }
          } catch (err) {
            setError(formatError(err));
          } finally {
            setSaving(false);
          }
        })}
      >
        {([
          ["legalName", "Legal name"],
          ["tradingName", "Trading name"],
          ["supplierCode", "Supplier code"],
          ["accountNumber", "Account number"],
          ["companyRegistrationNumber", "Company registration number"],
          ["vatRegistrationNumber", "VAT registration number"],
          ["email", "Email"],
          ["telephone", "Telephone"],
          ["website", "Website"],
          ["addressLine1", "Address line 1"],
          ["addressLine2", "Address line 2"],
          ["city", "Town or city"],
          ["county", "County"],
          ["postcode", "Postcode"],
          ["paymentTermsDescription", "Payment terms"],
          ["creditLimit", "Credit limit placeholder"],
          ["typicalLeadTimeDays", "Typical lead time (days)"],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {label}
            </label>
            <Input {...register(key)} />
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Country
          </label>
          <Input {...register("countryCode")} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Currency
          </label>
          <Input {...register("defaultCurrency")} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("status")}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-7">
          <input
            id="preferredSupplier"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            {...register("preferredSupplier")}
          />
          <label
            htmlFor="preferredSupplier"
            className="text-sm font-medium text-slate-700"
          >
            Preferred supplier
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Minimum order notes
          </label>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("minimumOrderNotes")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Delivery notes
          </label>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("deliveryNotes")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Return policy notes
          </label>
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("returnPolicyNotes")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Internal notes
          </label>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("internalNotes")}
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create supplier"
                : "Save supplier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
