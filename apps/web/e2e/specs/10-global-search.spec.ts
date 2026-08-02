import { APIRequestContext } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";

const API_BASE_URL = "http://localhost:4000/api/v1";

type ApiEnvelope<T> = { data: T; error: { message: string } | null };
type Branch = { id: string; isDefault: boolean };
type LeadConversion = { customer: { id: string; displayName: string }; site: { id: string } };
type Quote = { id: string };
type Job = { id: string; jobNumber: string; invoices?: Array<{ id: string; invoiceNumber: string; balanceDue: string | number }> };

async function api<T>(request: APIRequestContext, method: "GET" | "POST", path: string, body?: unknown) {
  const response = await request.fetch(`${API_BASE_URL}${path}`, {
    method,
    data: body,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  expect(response.ok(), `${method} ${path}: ${payload.error?.message ?? response.statusText()}`).toBeTruthy();
  return payload.data;
}

test.describe("Global Search UAT", () => {
  test("searches records, supports keyboard navigation, and opens results", async ({ tenantAPage, tenantBPage }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const branches = await api<Branch[]>(tenantAPage.request, "GET", "/branches");
    const branch = branches.find((item) => item.isDefault) ?? branches[0];
    expect(branch).toBeTruthy();

    const lead = await api<{ id: string }>(tenantAPage.request, "POST", "/leads", {
      firstName: "Searchable",
      lastName: suffix,
      email: `search.${suffix}@example.test`,
      phone: "07123456789",
      source: "Global Search UAT",
      branchId: branch!.id,
    });
    const conversion = await api<LeadConversion>(tenantAPage.request, "POST", `/leads/${lead.id}/convert`, {
      customerType: "RESIDENTIAL",
      siteType: "RESIDENTIAL",
      siteLabel: `Search Site ${suffix}`,
    });
    const estimate = await api<{ id: string }>(tenantAPage.request, "POST", "/estimates", {
      branchId: branch!.id,
      customerId: conversion.customer.id,
      siteId: conversion.site.id,
      title: `Search Estimate ${suffix}`,
      currency: "GBP",
      vatRate: 0.2,
      lines: [{ lineType: "LABOUR", description: "Search labour", quantity: 1, unit: "DAY", unitCost: 10, unitSellPrice: 100, vatRate: 0.2 }],
    });
    await api(tenantAPage.request, "POST", `/estimates/${estimate.id}/ready-for-quote`);
    const quote = await api<Quote>(tenantAPage.request, "POST", `/estimates/${estimate.id}/create-quote`, {
      title: `Search Quote ${suffix}`,
      depositRequired: 0,
    });
    await api(tenantAPage.request, "POST", `/quotes/${quote.id}/send`);
    await api(tenantAPage.request, "POST", `/quotes/${quote.id}/approve`);
    let job = await api<Job>(tenantAPage.request, "POST", `/quotes/${quote.id}/create-job`, {
      title: `Search Job ${suffix}`,
    });
    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/complete`, {
      completionNotes: "Search UAT complete.",
      customerSignoffName: "Search Customer",
    });
    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/create-invoice`, {
      notes: "Search invoice.",
    });
    const invoice = job.invoices?.[0];
    expect(invoice).toBeTruthy();

    const tenantBSearch = await tenantBPage.request.get(`${API_BASE_URL}/search?q=${encodeURIComponent(conversion.customer.displayName)}`);
    const tenantBPayload = (await tenantBSearch.json()) as ApiEnvelope<{ results: unknown[] }>;
    expect(tenantBSearch.ok()).toBeTruthy();
    expect(tenantBPayload.data.results).toHaveLength(0);

    await tenantAPage.goto("/app/dashboard");
    await tenantAPage.keyboard.press("Control+K");
    await expect(tenantAPage.getByRole("dialog")).toBeVisible();
    await tenantAPage.getByLabel("Search the ERP").fill(conversion.customer.displayName);
    await expect(tenantAPage.getByRole("button", { name: new RegExp(`Customer: ${conversion.customer.displayName}`) })).toBeVisible();
    await tenantAPage.keyboard.press("Enter");
    await tenantAPage.waitForURL(new RegExp(`/app/crm/customers/${conversion.customer.id}`), { timeout: 30000 });

    await tenantAPage.keyboard.press("Control+K");
    await tenantAPage.getByLabel("Search the ERP").fill(job.jobNumber);
    await expect(tenantAPage.getByRole("button", { name: new RegExp(`Job: ${job.jobNumber}`) })).toBeVisible();

    await tenantAPage.getByLabel("Search the ERP").fill(invoice!.invoiceNumber);
    await expect(tenantAPage.getByRole("button", { name: new RegExp(`Invoice: ${invoice!.invoiceNumber}`) })).toBeVisible();

    await tenantAPage.getByLabel("Search the ERP").fill("Heather Loop Carpet");
    await expect(tenantAPage.getByRole("button", { name: /Product: Heather Loop Carpet/ })).toBeVisible();

    await tenantAPage.getByLabel("Search the ERP").fill("PFD-001");
    await expect(tenantAPage.getByRole("button", { name: /Supplier:/ })).toBeVisible();

    await tenantAPage.getByLabel("Search the ERP").fill("zzzz-no-results");
    await expect(tenantAPage.getByText("No matching records found.")).toBeVisible();
  });
});
