import { APIRequestContext } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";

const API_BASE_URL = "http://localhost:4000/api/v1";

type ApiEnvelope<T> = { data: T; error: { message: string } | null };
type Branch = { id: string; isDefault: boolean };
type LeadConversion = { customer: { id: string; displayName: string }; site: { id: string; label: string }; lead: { id: string; status: string } };
type Quote = { id: string; status: string };
type Job = { id: string; jobNumber: string; status: string; invoices?: Array<{ id: string; invoiceNumber: string; balanceDue: string; status: string }> };
type Customer360 = {
  customer: { id: string; displayName: string };
  summary: { totalInvoiced: number; totalPaid: number; outstandingBalance: number; siteCount: number; activeJobCount: number };
  related: { sites: unknown[]; leads: unknown[]; estimates: unknown[]; quotes: unknown[]; jobs: unknown[]; invoices: unknown[]; payments: unknown[] };
  timeline: Array<{ action: string; date: string; href: string }>;
  quickActions: { addSite: boolean; createEstimate: boolean };
};

async function api<T>(request: APIRequestContext, method: "GET" | "POST" | "PATCH", path: string, body?: unknown) {
  const response = await request.fetch(`${API_BASE_URL}${path}`, {
    method,
    data: body,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  expect(response.ok(), `${method} ${path}: ${payload.error?.message ?? response.statusText()}`).toBeTruthy();
  return payload.data;
}

test.describe("Customer 360 UAT", () => {
  test("shows a tenant-safe customer operational timeline and related records", async ({ tenantAPage, tenantBPage }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const branches = await api<Branch[]>(tenantAPage.request, "GET", "/branches");
    const branch = branches.find((item) => item.isDefault) ?? branches[0];
    expect(branch).toBeTruthy();

    const lead = await api<{ id: string }>(tenantAPage.request, "POST", "/leads", {
      firstName: "Customer360",
      lastName: suffix,
      email: `customer360.${suffix}@example.test`,
      phone: "07123456789",
      source: "Customer 360 UAT",
      addressLine1: "42 Customer View",
      city: "Leeds",
      postcode: "LS1 1AA",
      branchId: branch!.id,
      notes: "Customer 360 notes from lead conversion.",
    });

    const conversion = await api<LeadConversion>(tenantAPage.request, "POST", `/leads/${lead.id}/convert`, {
      customerType: "RESIDENTIAL",
      siteType: "RESIDENTIAL",
      siteLabel: `Customer 360 Site ${suffix}`,
    });

    const estimate = await api<{ id: string }>(tenantAPage.request, "POST", "/estimates", {
      branchId: branch!.id,
      customerId: conversion.customer.id,
      siteId: conversion.site.id,
      title: `Customer 360 Estimate ${suffix}`,
      currency: "GBP",
      vatRate: 0.2,
      lines: [
        {
          lineType: "LABOUR",
          description: "Customer 360 installation labour",
          quantity: 1,
          unit: "DAY",
          unitCost: 10,
          unitSellPrice: 100,
          vatRate: 0.2,
        },
      ],
    });
    await api(tenantAPage.request, "POST", `/estimates/${estimate.id}/ready-for-quote`);
    const quote = await api<Quote>(tenantAPage.request, "POST", `/estimates/${estimate.id}/create-quote`, {
      title: `Customer 360 Quote ${suffix}`,
      depositRequired: 0,
    });
    await api(tenantAPage.request, "POST", `/quotes/${quote.id}/send`);
    await api<Quote>(tenantAPage.request, "POST", `/quotes/${quote.id}/approve`);

    let job = await api<Job>(tenantAPage.request, "POST", `/quotes/${quote.id}/create-job`, {
      title: `Customer 360 Job ${suffix}`,
    });
    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/complete`, {
      completionNotes: "Customer 360 job completed.",
      customerSignoffName: "Customer 360",
    });
    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/create-invoice`, {
      notes: "Customer 360 invoice.",
    });
    const invoice = job.invoices?.[0];
    expect(invoice).toBeTruthy();
    await api<Job>(tenantAPage.request, "POST", `/invoices/${invoice!.id}/payments`, {
      amount: Number(invoice!.balanceDue),
      method: "CARD",
      reference: `C360-${suffix}`,
      idempotencyKey: `c360-payment-${suffix}`,
    });

    const customer360 = await api<Customer360>(tenantAPage.request, "GET", `/customers/${conversion.customer.id}/360`);
    expect(customer360.customer.displayName).toBe(conversion.customer.displayName);
    expect(customer360.summary.totalInvoiced).toBeGreaterThan(0);
    expect(customer360.summary.totalPaid).toBeGreaterThan(0);
    expect(customer360.summary.outstandingBalance).toBe(0);
    expect(customer360.summary.siteCount).toBeGreaterThanOrEqual(1);
    expect(customer360.summary.activeJobCount).toBe(0);
    expect(customer360.related.sites.length).toBeGreaterThan(0);
    expect(customer360.related.estimates.length).toBeGreaterThan(0);
    expect(customer360.related.quotes.length).toBeGreaterThan(0);
    expect(customer360.related.jobs.length).toBeGreaterThan(0);
    expect(customer360.related.invoices.length).toBeGreaterThan(0);
    expect(customer360.related.payments.length).toBeGreaterThan(0);
    expect(customer360.quickActions.addSite).toBeTruthy();
    expect(customer360.quickActions.createEstimate).toBeTruthy();
    expect(customer360.timeline.map((item) => item.action)).toEqual(expect.arrayContaining(["Lead converted", "Estimate created", "Quote approved", "Job completed", "Invoice generated", "Payment recorded"]));
    const sortedTimeline = [...customer360.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    expect(customer360.timeline.map((item) => item.date)).toEqual(sortedTimeline.map((item) => item.date));

    const tenantBAccess = await tenantBPage.request.get(`${API_BASE_URL}/customers/${conversion.customer.id}/360`);
    expect([403, 404]).toContain(tenantBAccess.status());

    await tenantAPage.goto(`/app/crm/customers/${conversion.customer.id}`);
    await expect(tenantAPage.getByRole("heading", { name: conversion.customer.displayName })).toBeVisible();
    await expect(tenantAPage.getByText("Customer 360", { exact: true })).toBeVisible();
    await expect(tenantAPage.getByRole("heading", { name: "Activity Timeline" })).toBeVisible();
    await expect(tenantAPage.getByText("Payment recorded").first()).toBeVisible();
    await expect(tenantAPage.getByRole("link", { name: /Customer 360 Job/ }).first()).toBeVisible();
    await tenantAPage.goto(`/app/jobs/${job.id}`);
    await tenantAPage.waitForURL(new RegExp(`/app/jobs/${job.id}`), { timeout: 30000 });
  });
});
