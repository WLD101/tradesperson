import { APIRequestContext } from "@playwright/test";
import { expect, test } from "../fixtures/auth.fixture";

const API_BASE_URL = "http://localhost:4000/api/v1";

type ApiEnvelope<T> = { data: T; error: { message: string } | null };
type Branch = { id: string; isDefault: boolean };
type LeadConversion = { customer: { id: string }; site: { id: string }; lead: { status: string } };
type Quote = { id: string; status: string };
type Job = { id: string; jobNumber: string; status: string; scheduledStart: string | null; scheduledEnd: string | null; assignedInstallerId: string | null };
type User = { id: string; email: string };

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

async function createQuote(request: APIRequestContext, branchId: string, suffix: string, title: string) {
  const lead = await api<{ id: string }>(request, "POST", "/leads", {
    firstName: "Scheduler",
    lastName: suffix,
    email: `scheduler.${suffix}@example.test`,
    phone: "07123456789",
    source: "Scheduler UAT",
    addressLine1: "10 Dispatch Road",
    city: "Manchester",
    postcode: "M1 1AA",
    branchId,
  });
  const conversion = await api<LeadConversion>(request, "POST", `/leads/${lead.id}/convert`, {
    customerType: "RESIDENTIAL",
    siteType: "RESIDENTIAL",
    siteLabel: `Scheduler Site ${suffix}`,
  });
  expect(conversion.lead.status).toBe("WON");
  const estimate = await api<{ id: string }>(request, "POST", "/estimates", {
    branchId,
    customerId: conversion.customer.id,
    siteId: conversion.site.id,
    title,
    currency: "GBP",
    vatRate: 0.2,
    lines: [
      {
        lineType: "LABOUR",
        description: "Scheduler installation labour",
        quantity: 1,
        unit: "DAY",
        unitCost: 10,
        unitSellPrice: 100,
        vatRate: 0.2,
      },
    ],
  });
  await api(request, "POST", `/estimates/${estimate.id}/ready-for-quote`);
  const quote = await api<Quote>(request, "POST", `/estimates/${estimate.id}/create-quote`, {
    title,
    depositRequired: 0,
  });
  await api(request, "POST", `/quotes/${quote.id}/send`);
  return api<Quote>(request, "POST", `/quotes/${quote.id}/approve`);
}

test.describe("Scheduler UAT", () => {
  test("schedules, detects conflicts, reschedules, and opens job details", async ({ tenantAPage }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const branches = await api<Branch[]>(tenantAPage.request, "GET", "/branches");
    const branch = branches.find((item) => item.isDefault) ?? branches[0];
    expect(branch).toBeTruthy();
    const user = await api<User>(tenantAPage.request, "GET", "/users/me");
    const scheduleOffsetDays = 45 + Math.floor(Math.random() * 120);
    const scheduleDate = new Date(Date.now() + scheduleOffsetDays * 24 * 60 * 60 * 1000);
    scheduleDate.setUTCHours(0, 0, 0, 0);
    const dateParam = scheduleDate.toISOString().slice(0, 10);
    const conflictStartInput = `${dateParam}T09:00`;
    const conflictEndInput = `${dateParam}T12:00`;
    const validStartInput = `${dateParam}T13:00`;
    const validEndInput = `${dateParam}T16:00`;

    const scheduledQuote = await createQuote(tenantAPage.request, branch!.id, `${suffix}.scheduled`, "Scheduler conflict job");
    const unscheduledQuote = await createQuote(tenantAPage.request, branch!.id, `${suffix}.unscheduled`, "Scheduler unscheduled job");
    const scheduledJob = await api<Job>(tenantAPage.request, "POST", `/quotes/${scheduledQuote.id}/create-job`, {
      title: `Scheduled ${suffix}`,
      scheduledStart: new Date(conflictStartInput).toISOString(),
      scheduledEnd: new Date(conflictEndInput).toISOString(),
      assignedInstallerId: user.id,
      installationTeamName: `Scheduler Team ${suffix}`,
    });
    const unscheduledJob = await api<Job>(tenantAPage.request, "POST", `/quotes/${unscheduledQuote.id}/create-job`, {
      title: `Unscheduled ${suffix}`,
    });

    await tenantAPage.goto(`/app/schedule?view=week&date=${dateParam}`);
    await expect(tenantAPage.getByRole("heading", { name: "Enterprise Dispatch" })).toBeVisible();
    await expect(tenantAPage.getByText(scheduledJob.jobNumber, { exact: true })).toBeVisible();
    await expect(tenantAPage.getByText(unscheduledJob.jobNumber, { exact: true })).toBeVisible();

    const unscheduledCard = tenantAPage.getByTestId(`unscheduled-job-${unscheduledJob.id}`);
    await expect(unscheduledCard).toBeVisible();
    await unscheduledCard.getByRole("button", { name: "Quick schedule" }).click();
    await tenantAPage.getByLabel("Assigned installer").selectOption(user.id);
    await tenantAPage.getByLabel("Schedule start").fill(`${dateParam}T09:30`);
    await tenantAPage.getByLabel("Schedule end").fill(`${dateParam}T11:30`);
    await tenantAPage.getByRole("button", { name: "Save schedule" }).click();
    await expect(tenantAPage.getByTestId("schedule-obvious-conflict")).toContainText("overlaps");
    await expect(tenantAPage.getByTestId("schedule-server-error")).toContainText("overlaps");
    await expect(tenantAPage.getByLabel("Schedule start")).toHaveValue(`${dateParam}T09:30`);

    await tenantAPage.getByLabel("Schedule start").fill(validStartInput);
    await tenantAPage.getByLabel("Schedule end").fill(validEndInput);
    await tenantAPage.getByRole("button", { name: "Save schedule" }).click();
    await expect(tenantAPage.getByRole("button", { name: "Saving..." })).toBeHidden();
    await expect(tenantAPage.getByRole("heading", { name: new RegExp(`Schedule ${unscheduledJob.jobNumber}`) })).toBeHidden();
    await expect(tenantAPage.getByRole("heading", { name: "Enterprise Dispatch" })).toBeVisible();
    await tenantAPage.reload();
    await expect(tenantAPage.getByText(unscheduledJob.jobNumber, { exact: true })).toBeVisible();

    const movedCard = tenantAPage.getByTestId(`scheduled-job-${unscheduledJob.id}`);
    await expect(movedCard).toBeVisible();
    await expect(movedCard).toContainText("SCHEDULED");
    await expect(movedCard).toContainText("Olivia Owner");
    await movedCard.getByRole("button", { name: "Details" }).click();
    await expect(tenantAPage.getByLabel("Job details")).toContainText("Material readiness");
    const fullJobLink = tenantAPage.getByTestId("schedule-full-job-link");
    await expect(fullJobLink).toHaveAttribute("href", `/app/jobs/${unscheduledJob.id}`);
    await tenantAPage.goto(`/app/jobs/${unscheduledJob.id}`);
    await expect(tenantAPage).toHaveURL(new RegExp(`/app/jobs/${unscheduledJob.id}`));
    await expect(tenantAPage.getByText(unscheduledJob.jobNumber, { exact: true }).first()).toBeVisible();

    const refreshed = await api<Job>(tenantAPage.request, "GET", `/jobs/${unscheduledJob.id}`);
    expect(refreshed.assignedInstallerId).toBe(user.id);
    expect(refreshed.scheduledStart).toBe(new Date(validStartInput).toISOString());
    expect(refreshed.scheduledEnd).toBe(new Date(validEndInput).toISOString());
  });
});
