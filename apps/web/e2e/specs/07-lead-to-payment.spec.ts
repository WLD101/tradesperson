import { APIRequestContext } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";

const API_BASE_URL = "http://localhost:4000/api/v1";

type ApiEnvelope<T> = {
  data: T;
  error: { message: string } | null;
};

type Branch = {
  id: string;
  name: string;
  isDefault: boolean;
};

type Product = {
  id: string;
  name: string;
  variants: Array<{ id: string; isDefault: boolean }>;
};

type LeadConversion = {
  customer: { id: string; displayName: string };
  site: { id: string; label: string };
  lead: { id: string; status: string };
};

type Survey = {
  id: string;
  reference: string;
  rooms?: Array<{ id: string; netArea: string }>;
};

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
};

type Job = {
  id: string;
  jobNumber: string;
  status: string;
  profitability?: {
    grossProfit: string;
    balanceDue: string;
  };
  materialRequirements?: Array<{
    id: string;
    status: string;
    stockReservations?: Array<{
      id: string;
      status: string;
      reservedQuantity: string;
      issuedQuantity: string;
    }>;
  }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: string;
    balanceDue: string;
    payments?: Array<{ id: string; amount: string }>;
  }>;
};

async function api<T>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
) {
  const response = await request.fetch(`${API_BASE_URL}${path}`, {
    method,
    data: body,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  expect(response.ok(), `${method} ${path}: ${payload.error?.message ?? response.statusText()}`).toBeTruthy();
  return payload.data;
}

async function optionalApi<T>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
) {
  const response = await request.fetch(`${API_BASE_URL}${path}`, {
    method,
    data: body,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  return { ok: response.ok(), status: response.status(), data: payload.data, error: payload.error };
}

test.describe("Lead to Payment MVP", () => {
  test.describe.configure({ timeout: 120_000 });

  test("creates a lead, completes a stocked job, invoices it, and records payment", async ({ tenantAPage }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const branches = await api<Branch[]>(tenantAPage.request, "GET", "/branches");
    const branch = branches.find((item) => item.isDefault) ?? branches[0];
    expect(branch, "Seeded tenant must expose at least one branch").toBeTruthy();

    const products = await api<{ items: Product[] }>(
      tenantAPage.request,
      "GET",
      "/catalogue/products?page=1&pageSize=20",
    );
    const stockedProduct = products.items.find((product) => product.variants.length > 0);
    expect(stockedProduct, "Seeded tenant must expose at least one catalogue product variant").toBeTruthy();
    const variant = stockedProduct!.variants.find((item) => item.isDefault) ?? stockedProduct!.variants[0]!;

    const user = await api<{ id: string; email: string }>(tenantAPage.request, "GET", "/users/me");

    const lead = await api<{ id: string }>(tenantAPage.request, "POST", "/leads", {
      firstName: "UAT",
      lastName: `Lead ${suffix}`,
      email: `uat.${suffix}@example.test`,
      phone: "07123456789",
      source: "Playwright UAT",
      addressLine1: "1 Test Terrace",
      city: "Bristol",
      postcode: "BS1 1AA",
      branchId: branch!.id,
      notes: "Database-backed lead-to-payment UAT.",
    });

    const conversion = await api<LeadConversion>(
      tenantAPage.request,
      "POST",
      `/leads/${lead.id}/convert`,
      {
        customerType: "RESIDENTIAL",
        siteType: "RESIDENTIAL",
        siteLabel: `UAT Site ${suffix}`,
      },
    );
    expect(conversion.lead.status).toBe("WON");

    const survey = await api<Survey>(tenantAPage.request, "POST", "/surveys", {
      customerId: conversion.customer.id,
      siteId: conversion.site.id,
      leadId: lead.id,
      branchId: branch!.id,
      reference: `UAT Survey ${suffix}`,
      purpose: "ESTIMATE",
    });

    const room = await api<{ id: string; netArea: string }>(
      tenantAPage.request,
      "POST",
      `/surveys/${survey.id}/rooms`,
      {
        name: "Living Room",
        floorLevel: "Ground",
        subfloorType: "CONCRETE",
        wastePercentage: 5,
      },
    );
    await api(tenantAPage.request, "POST", `/surveys/${survey.id}/rooms/${room.id}/components`, {
      type: "RECTANGLE",
      operation: "ADD",
      dimensions: { length: 3, width: 2 },
      notes: "Six square metres for MVP UAT.",
    });

    await api(tenantAPage.request, "PATCH", `/surveys/${survey.id}/status`, { status: "SCHEDULED" });
    await api(tenantAPage.request, "PATCH", `/surveys/${survey.id}/status`, { status: "IN_PROGRESS" });
    await api(tenantAPage.request, "PATCH", `/surveys/${survey.id}/status`, { status: "COMPLETED" });
    const measuredSurvey = await api<Survey>(tenantAPage.request, "GET", `/surveys/${survey.id}`);
    expect(Number(measuredSurvey.rooms?.[0]?.netArea ?? 0)).toBeGreaterThan(0);

    const estimate = await api<{ id: string; status: string }>(tenantAPage.request, "POST", "/estimates", {
      branchId: branch!.id,
      customerId: conversion.customer.id,
      siteId: conversion.site.id,
      surveyId: survey.id,
      title: `UAT Estimate ${suffix}`,
      currency: "GBP",
      vatRate: 0.2,
      importSurveyRooms: true,
      lines: [
        {
          lineType: "MATERIAL",
          productId: stockedProduct!.id,
          productVariantId: variant.id,
          description: `${stockedProduct!.name} MVP material`,
          quantity: 1,
          unit: "SQM",
          unitCost: 8,
          unitSellPrice: 30,
          vatRate: 0.2,
        },
        {
          lineType: "LABOUR",
          description: "Flooring installation labour",
          quantity: 1,
          unit: "DAY",
          unitCost: 10,
          unitSellPrice: 20,
          vatRate: 0.2,
        },
      ],
    });

    await api(tenantAPage.request, "POST", `/estimates/${estimate.id}/ready-for-quote`);
    const quote = await api<Quote>(tenantAPage.request, "POST", `/estimates/${estimate.id}/create-quote`, {
      title: `UAT Quote ${suffix}`,
      depositRequired: 0,
      customerNotes: "Approved through lead-to-payment UAT.",
    });
    await api(tenantAPage.request, "POST", `/quotes/${quote.id}/send`);
    const approvedQuote = await api<Quote>(tenantAPage.request, "POST", `/quotes/${quote.id}/approve`);
    expect(approvedQuote.status).toBe("APPROVED");

    const scheduledStart = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    scheduledStart.setUTCHours(9, 0, 0, 0);
    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setUTCHours(17, 0, 0, 0);

    let job = await api<Job>(tenantAPage.request, "POST", `/quotes/${quote.id}/create-job`, {
      title: `UAT Flooring Job ${suffix}`,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      assignedInstallerId: user.id,
      installationTeamName: `UAT Team ${suffix}`,
      accessNotes: "Key safe at front door.",
      workNotes: "Install after subfloor check.",
    });
    expect(job.status).toBe("SCHEDULED");

    const doubleBook = await optionalApi<Job>(
      tenantAPage.request,
      "POST",
      `/quotes/${quote.id}/create-job`,
      {
        title: `UAT Double Book ${suffix}`,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        assignedInstallerId: user.id,
      },
    );
    expect(doubleBook.ok, "Same installer/time slot must be rejected").toBeFalsy();
    expect(doubleBook.status).toBe(400);

    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/material-requirements/generate`);
    expect(job.materialRequirements?.length ?? 0).toBeGreaterThan(0);

    const reserved = await optionalApi<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/material-requirements/reserve-stock`);
    if (reserved.ok) {
      job = reserved.data;
      expect(job.materialRequirements?.some((item) => item.stockReservations?.length)).toBeTruthy();

      job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/material-requirements/issue-stock`);
      const issuedReservation = job.materialRequirements
        ?.flatMap((requirement) => requirement.stockReservations ?? [])
        .find((reservation) => Number(reservation.issuedQuantity) > 0);
      expect(issuedReservation, "Issued stock reservation should be present after material issue").toBeTruthy();

      job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/material-requirements/return-stock`, {
        idempotencyKey: `uat-return-${suffix}`,
        notes: "Return split between usable and damaged stock for MVP UAT.",
        lines: [
          {
            stockReservationId: issuedReservation!.id,
            usableQuantity: 0.25,
            damagedQuantity: 0.25,
            notes: "Small partial return after installation.",
          },
        ],
      });
    } else {
      expect(
        reserved.error?.message,
        "Stock reservation can only be skipped when seeded stock is unavailable for the selected product.",
      ).toContain("stock");
    }

    const noMismatches = await api<{ mismatchCount: number; rows: Array<{ matches: boolean }> }>(
      tenantAPage.request,
      "GET",
      "/inventory/reconciliation",
    );
    expect(noMismatches.mismatchCount, JSON.stringify(noMismatches.rows.filter((row) => !row.matches))).toBe(0);

    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/complete`, {
      completionNotes: "Install completed through UAT.",
      customerSignoffName: "UAT Customer",
    });
    expect(job.status).toBe("COMPLETED");

    job = await api<Job>(tenantAPage.request, "POST", `/jobs/${job.id}/create-invoice`, {
      notes: "Invoice generated by lead-to-payment UAT.",
    });
    const invoice = job.invoices?.find((item) => item.status !== "CANCELLED");
    expect(invoice, "Completed job should have an invoice").toBeTruthy();

    const pdfResponse = await tenantAPage.request.get(`${API_BASE_URL}/invoices/${invoice!.id}/pdf`);
    expect(pdfResponse.ok()).toBeTruthy();
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

    job = await api<Job>(tenantAPage.request, "POST", `/invoices/${invoice!.id}/payments`, {
      amount: Number(invoice!.balanceDue),
      method: "CARD",
      reference: `UAT-${suffix}`,
      idempotencyKey: `uat-payment-${suffix}`,
      notes: "Final payment recorded through UAT.",
    });
    expect(job.invoices?.find((item) => item.id === invoice!.id)?.status).toBe("PAID");

    job = await api<Job>(tenantAPage.request, "GET", `/jobs/${job.id}`);
    expect(job.profitability?.grossProfit).toBeDefined();
    expect(Number.isFinite(Number(job.profitability?.grossProfit))).toBeTruthy();
    expect(Number.isFinite(Number(job.profitability?.balanceDue))).toBeTruthy();

    await tenantAPage.goto(`/app/jobs/${job.id}`);
    await expect(tenantAPage.getByText(job.jobNumber, { exact: true }).first()).toBeVisible();
    await expect(tenantAPage.getByText("Gross profit")).toBeVisible();
    await expect(tenantAPage.getByText("Invoice & Payments")).toBeVisible();
    await expect(tenantAPage.getByText("PAID", { exact: true })).toBeVisible();
  });
});
