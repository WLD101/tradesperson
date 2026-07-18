import Link from "next/link";
import { Card, Input } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import {
  fetchSupplierProductOptions,
  getSupplierPermissions,
  type SupplierDetail,
} from "@/lib/suppliers";
import { fetchCatalogueLookups } from "@/lib/catalogue";

async function archiveSupplier(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/archive`, { method: "PATCH" });
}

async function restoreSupplier(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/restore`, { method: "PATCH" });
}

async function createContact(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/contacts`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      jobTitle: formData.get("jobTitle") || null,
      email: formData.get("email") || null,
      telephone: formData.get("telephone") || null,
      mobile: formData.get("mobile") || null,
      isPrimary: formData.get("isPrimary") === "on",
      isOrderingContact: formData.get("isOrderingContact") === "on",
      isAccountsContact: formData.get("isAccountsContact") === "on",
      isTechnicalContact: formData.get("isTechnicalContact") === "on",
      notes: formData.get("notes") || null,
    }),
  });
}

async function updateContact(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const contactId = String(formData.get("contactId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: formData.get("name"),
      jobTitle: formData.get("jobTitle") || null,
      email: formData.get("email") || null,
      telephone: formData.get("telephone") || null,
      mobile: formData.get("mobile") || null,
      isPrimary: formData.get("isPrimary") === "on",
      isOrderingContact: formData.get("isOrderingContact") === "on",
      isAccountsContact: formData.get("isAccountsContact") === "on",
      isTechnicalContact: formData.get("isTechnicalContact") === "on",
      status: formData.get("status"),
      notes: formData.get("notes") || null,
    }),
  });
}

async function archiveContact(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const contactId = String(formData.get("contactId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/contacts/${contactId}/archive`, {
    method: "PATCH",
  });
}

async function restoreContact(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const contactId = String(formData.get("contactId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/contacts/${contactId}/restore`, {
    method: "PATCH",
  });
}

async function createSupplierProduct(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/products`, {
    method: "POST",
    body: JSON.stringify({
      productId: formData.get("productId"),
      variantId: formData.get("variantId") || null,
      supplierUnitId: formData.get("supplierUnitId") || null,
      supplierSku: formData.get("supplierSku"),
      supplierDescription: formData.get("supplierDescription") || null,
      packQuantity: formData.get("packQuantity")
        ? Number(formData.get("packQuantity"))
        : null,
      packCoverageM2: formData.get("packCoverageM2")
        ? Number(formData.get("packCoverageM2"))
        : null,
      rollWidthM: formData.get("rollWidthM")
        ? Number(formData.get("rollWidthM"))
        : null,
      standardRollLengthM: formData.get("standardRollLengthM")
        ? Number(formData.get("standardRollLengthM"))
        : null,
      minimumOrderQty: formData.get("minimumOrderQty")
        ? Number(formData.get("minimumOrderQty"))
        : null,
      leadTimeDays: formData.get("leadTimeDays")
        ? Number(formData.get("leadTimeDays"))
        : null,
      preferredSupplier: formData.get("preferredSupplier") === "on",
      lastConfirmedAt: formData.get("lastConfirmedAt") || null,
      notes: formData.get("notes") || null,
    }),
  });
}

async function updateSupplierProduct(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const supplierProductId = String(formData.get("supplierProductId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/products/${supplierProductId}`, {
    method: "PATCH",
    body: JSON.stringify({
      productId: formData.get("productId"),
      variantId: formData.get("variantId") || null,
      supplierUnitId: formData.get("supplierUnitId") || null,
      supplierSku: formData.get("supplierSku"),
      supplierDescription: formData.get("supplierDescription") || null,
      packQuantity: formData.get("packQuantity")
        ? Number(formData.get("packQuantity"))
        : null,
      packCoverageM2: formData.get("packCoverageM2")
        ? Number(formData.get("packCoverageM2"))
        : null,
      rollWidthM: formData.get("rollWidthM")
        ? Number(formData.get("rollWidthM"))
        : null,
      standardRollLengthM: formData.get("standardRollLengthM")
        ? Number(formData.get("standardRollLengthM"))
        : null,
      minimumOrderQty: formData.get("minimumOrderQty")
        ? Number(formData.get("minimumOrderQty"))
        : null,
      leadTimeDays: formData.get("leadTimeDays")
        ? Number(formData.get("leadTimeDays"))
        : null,
      preferredSupplier: formData.get("preferredSupplier") === "on",
      status: formData.get("status"),
      lastConfirmedAt: formData.get("lastConfirmedAt") || null,
      notes: formData.get("notes") || null,
    }),
  });
}

async function archiveSupplierProduct(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const supplierProductId = String(formData.get("supplierProductId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/products/${supplierProductId}/archive`, {
    method: "PATCH",
  });
}

async function restoreSupplierProduct(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  const supplierProductId = String(formData.get("supplierProductId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/products/${supplierProductId}/restore`, {
    method: "PATCH",
  });
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  const { id } = await params;
  const [supplier, productOptions, lookups] = await Promise.all([
    apiFetch<SupplierDetail>(`/api/v1/suppliers/${id}`),
    fetchSupplierProductOptions(),
    fetchCatalogueLookups(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/app/suppliers"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to suppliers
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {supplier.tradingName ?? supplier.legalName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {supplier.supplierCode} • {supplier.status} • {supplier.defaultCurrency}
          </p>
        </div>
        {permissions.canManage ? (
          <div className="flex flex-wrap gap-3">
            {permissions.canViewPricing ? (
              <Link
                href={`/app/suppliers/${supplier.id}/pricing`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Pricing
              </Link>
            ) : null}
            <Link
              href={`/app/suppliers/${supplier.id}/edit`}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit supplier
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Supplier overview</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["Legal name", supplier.legalName],
              ["Trading name", supplier.tradingName ?? "Not set"],
              ["Account number", supplier.accountNumber ?? "Not set"],
              ["Email", supplier.email ?? "Not set"],
              ["Telephone", supplier.telephone ?? "Not set"],
              ["Website", supplier.website ?? "Not set"],
              ["Town or city", supplier.city ?? "Not set"],
              ["Postcode", supplier.postcode ?? "Not set"],
              ["Country", supplier.countryCode],
              [
                "Typical lead time",
                supplier.typicalLeadTimeDays == null
                  ? "Not set"
                  : `${supplier.typicalLeadTimeDays} days`,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-sm text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Payment terms: {supplier.paymentTermsDescription ?? "Not set"}</p>
            <p>Delivery notes: {supplier.deliveryNotes ?? "Not set"}</p>
            <p>Minimum order notes: {supplier.minimumOrderNotes ?? "Not set"}</p>
            <p>Return policy: {supplier.returnPolicyNotes ?? "Not set"}</p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Lifecycle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Supplier records stay tenant-owned. Pricing, history, and import preview now live on the Phase C pricing route.
          </p>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-700">
              Preferred supplier: {supplier.preferredSupplier ? "Yes" : "No"}
            </p>
            <p className="text-sm text-slate-700">
              Linked products: {supplier.supplierProducts.length}
            </p>
            {permissions.canArchive ? (
              supplier.status === "ARCHIVED" ? (
                <form action={restoreSupplier}>
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Restore supplier
                  </button>
                </form>
              ) : (
                <form action={archiveSupplier}>
                  <input type="hidden" name="supplierId" value={supplier.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
                  >
                    Archive supplier
                  </button>
                </form>
              )
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Contacts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Maintain commercial, ordering, accounts, and technical contacts here.
            </p>
          </div>
          <p className="text-sm text-slate-500">{supplier.contacts.length} total</p>
        </div>

        <div className="mt-4 space-y-4">
          {supplier.contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-slate-200 px-4 py-4">
              <form action={updateContact} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="contactId" value={contact.id} />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
                  <Input name="name" defaultValue={contact.name} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job title</label>
                  <Input name="jobTitle" defaultValue={contact.jobTitle ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                  <Input name="email" defaultValue={contact.email ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Telephone</label>
                  <Input name="telephone" defaultValue={contact.telephone ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile</label>
                  <Input name="mobile" defaultValue={contact.mobile ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <select
                    name="status"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    defaultValue={contact.status}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                {([
                  ["isPrimary", "Primary"],
                  ["isOrderingContact", "Ordering"],
                  ["isAccountsContact", "Accounts"],
                  ["isTechnicalContact", "Technical"],
                ] as const).map(([name, label]) => (
                  <div key={name} className="flex items-center gap-2 pt-6">
                    <input
                      id={`${name}-${contact.id}`}
                      type="checkbox"
                      name={name}
                      defaultChecked={contact[name]}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <label htmlFor={`${name}-${contact.id}`} className="text-sm text-slate-700">
                      {label}
                    </label>
                  </div>
                ))}
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={contact.notes ?? ""}
                    className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>
                <div className="md:col-span-3 flex flex-wrap justify-end gap-3">
                  {permissions.canManageContacts ? (
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Save contact
                    </button>
                  ) : null}
                  {permissions.canManageContacts ? (
                    contact.status === "ARCHIVED" ? (
                      <button
                        type="submit"
                        formAction={restoreContact}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Restore contact
                      </button>
                    ) : (
                      <button
                        type="submit"
                        formAction={archiveContact}
                        className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
                      >
                        Archive contact
                      </button>
                    )
                  ) : null}
                </div>
              </form>
            </div>
          ))}

          {permissions.canManageContacts ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-950">Add contact</h3>
              <form action={createContact} className="mt-4 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <Input name="name" placeholder="Name" required />
                <Input name="jobTitle" placeholder="Job title" />
                <Input name="email" placeholder="Email" />
                <Input name="telephone" placeholder="Telephone" />
                <Input name="mobile" placeholder="Mobile" />
                <div className="flex items-center gap-2 pt-2">
                  <input id="new-isPrimary" type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-slate-300" />
                  <label htmlFor="new-isPrimary" className="text-sm text-slate-700">Primary contact</label>
                </div>
                <div className="md:col-span-3">
                  <textarea
                    name="notes"
                    placeholder="Notes"
                    className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Add contact
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Supplier products</h2>
            <p className="mt-1 text-sm text-slate-500">
              Link current catalogue products to this supplier without adding costs yet.
            </p>
          </div>
          <p className="text-sm text-slate-500">{supplier.supplierProducts.length} linked</p>
        </div>

        <div className="mt-4 space-y-4">
          {supplier.supplierProducts.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-4">
              <form action={updateSupplierProduct} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <input type="hidden" name="supplierProductId" value={item.id} />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Product</label>
                  <select
                    name="productId"
                    defaultValue={item.product.id}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Variant</label>
                  <select
                    name="variantId"
                    defaultValue={item.variant?.id ?? ""}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="">Product default / none</option>
                    {productOptions.flatMap((product) =>
                      product.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {product.name} - {variant.name} ({variant.sku})
                        </option>
                      )),
                    )}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier unit</label>
                  <select
                    name="supplierUnitId"
                    defaultValue={item.supplierUnit?.id ?? ""}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="">Not set</option>
                    {lookups.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                </div>
                {[
                  ["supplierSku", "Supplier SKU", item.supplierSku],
                  ["supplierDescription", "Description", item.supplierDescription ?? ""],
                  ["packQuantity", "Pack quantity", item.packQuantity ?? ""],
                  ["packCoverageM2", "Pack coverage (m2)", item.packCoverageM2 ?? ""],
                  ["rollWidthM", "Roll width (m)", item.rollWidthM ?? ""],
                  ["standardRollLengthM", "Roll length (m)", item.standardRollLengthM ?? ""],
                  ["minimumOrderQty", "Minimum order", item.minimumOrderQty ?? ""],
                  ["leadTimeDays", "Lead time (days)", item.leadTimeDays?.toString() ?? ""],
                  [
                    "lastConfirmedAt",
                    "Last confirmed",
                    item.lastConfirmedAt ? item.lastConfirmedAt.slice(0, 10) : "",
                  ],
                ].map(([name, label, value]) => (
                  <div key={name}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                    <Input name={name} defaultValue={value} />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <select
                    name="status"
                    defaultValue={item.status}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id={`preferred-${item.id}`}
                    type="checkbox"
                    name="preferredSupplier"
                    defaultChecked={item.preferredSupplier}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor={`preferred-${item.id}`} className="text-sm text-slate-700">
                    Preferred link
                  </label>
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                  <textarea
                    name="notes"
                    defaultValue={item.notes ?? ""}
                    className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>
                <div className="md:col-span-3 flex flex-wrap justify-end gap-3">
                  {permissions.canManageProducts ? (
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Save link
                    </button>
                  ) : null}
                  {permissions.canManageProducts ? (
                    item.status === "ARCHIVED" ? (
                      <button
                        type="submit"
                        formAction={restoreSupplierProduct}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Restore link
                      </button>
                    ) : (
                      <button
                        type="submit"
                        formAction={archiveSupplierProduct}
                        className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
                      >
                        Archive link
                      </button>
                    )
                  ) : null}
                </div>
              </form>
            </div>
          ))}

          {permissions.canManageProducts ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-950">Link product</h3>
              <form action={createSupplierProduct} className="mt-4 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <select
                  name="productId"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  required
                  defaultValue=""
                >
                  <option value="">Select product</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                <select
                  name="variantId"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  defaultValue=""
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
                <select
                  name="supplierUnitId"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  defaultValue=""
                >
                  <option value="">Optional supplier unit</option>
                  {lookups.units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
                <Input name="supplierSku" placeholder="Supplier SKU" required />
                <Input name="supplierDescription" placeholder="Description" />
                <Input name="packQuantity" placeholder="Pack quantity" />
                <Input name="packCoverageM2" placeholder="Pack coverage (m2)" />
                <Input name="rollWidthM" placeholder="Roll width (m)" />
                <Input name="standardRollLengthM" placeholder="Roll length (m)" />
                <Input name="minimumOrderQty" placeholder="Minimum order" />
                <Input name="leadTimeDays" placeholder="Lead time (days)" />
                <Input name="lastConfirmedAt" type="date" />
                <div className="flex items-center gap-2 pt-2">
                  <input id="new-preferredSupplier" type="checkbox" name="preferredSupplier" className="h-4 w-4 rounded border-slate-300" />
                  <label htmlFor="new-preferredSupplier" className="text-sm text-slate-700">Preferred link</label>
                </div>
                <div className="md:col-span-3">
                  <textarea
                    name="notes"
                    placeholder="Notes"
                    className="min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Add product link
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
