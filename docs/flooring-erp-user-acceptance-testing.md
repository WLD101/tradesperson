# Flooring ERP User Acceptance Testing

Date: 2026-07-25
Decision status: `BLOCKED`

Use this document for manual browser UAT. Each case includes an evidence field and pass/fail field so testers can attach screenshots, API response IDs, or notes.

Development credentials are documented in `docs/development-access.md` and are unsafe for production.

## UAT-01 Login

Preconditions: Docker services running, migrations applied, seed completed.

User role: Tenant owner.

Steps: Open `http://localhost:3000/sign-in`, enter `owner@exampleflooring.local`, enter the development password from `docs/development-access.md`, submit, and select `Example Flooring Ltd` if prompted.

Expected result: User reaches the app dashboard with the correct tenant context.

Failure result: Login error, tenant missing, redirect loop, or failed API call.

Evidence:

Pass or fail:

## UAT-02 Lead Creation

Preconditions: User is logged in as tenant owner or manager.

User role: Tenant owner or manager.

Steps: Open Leads, create a new lead with name, email, phone, source, and address.

Expected result: Lead appears in the leads list and is scoped to the active tenant/branch.

Failure result: Validation failure for valid data, missing lead, or cross-tenant data visible.

Evidence:

Pass or fail:

## UAT-03 Lead Conversion

Preconditions: A non-converted lead exists.

User role: Tenant owner or manager.

Steps: Open the lead, convert it to a customer and site.

Expected result: Lead status changes to won/converted, a customer is created, and a site is linked.

Failure result: Duplicate conversion, missing customer/site, or unsafe error details.

Evidence:

Pass or fail:

## UAT-04 Site Creation

Preconditions: A customer exists.

User role: Tenant owner or manager.

Steps: Create a site for the customer with address and access notes.

Expected result: Site appears in the site list and customer detail.

Failure result: Site not saved or linked to wrong customer/tenant.

Evidence:

Pass or fail:

## UAT-05 Survey Scheduling

Preconditions: A site exists.

User role: Surveyor or manager.

Steps: Create a survey for the site with scheduled time and surveyor.

Expected result: Survey appears in survey list/detail.

Failure result: Survey cannot be created or references another tenant's site.

Evidence:

Pass or fail:

## UAT-06 Measurement Entry

Preconditions: Survey exists.

User role: Surveyor.

Steps: Add rooms and measurement components including an add area and deduction.

Expected result: Server recalculates room totals and net/required areas.

Failure result: Browser-only totals differ from server values or calculation fails.

Evidence:

Pass or fail:

## UAT-07 Survey Approval

Preconditions: Survey has complete measurements.

User role: Manager.

Steps: Submit and approve/review the survey using available status actions.

Expected result: Survey status changes and audit trail is recorded.

Failure result: Invalid status transition accepted or valid transition rejected.

Evidence:

Pass or fail:

## UAT-08 Estimate

Preconditions: Approved survey or existing customer/site.

User role: Estimator.

Steps: Create estimate, import survey rooms if applicable, add material/labour/accessory lines, recalculate.

Expected result: Server calculates subtotal, VAT, grand total, gross profit, and margin.

Failure result: Totals are client-only or inaccurate.

Evidence:

Pass or fail:

## UAT-09 Quote

Preconditions: Estimate is ready for quote.

User role: Estimator or manager.

Steps: Create quote from estimate, review lines/totals, send and approve where applicable.

Expected result: Quote totals match estimate-derived values and versions are recorded.

Failure result: Quote totals drift or accepted/approved quote remains silently editable.

Evidence:

Pass or fail:

## UAT-10 Quote Acceptance

Preconditions: Quote is approved/sent.

User role: Manager.

Steps: Accept or approve quote using implemented status action and verify conversion eligibility.

Expected result: Quote can be converted to a job only in a valid status.

Failure result: Draft/rejected quote converts to job or accepted quote can be silently modified.

Evidence:

Pass or fail:

## UAT-11 Job Creation

Preconditions: Approved quote exists.

User role: Manager.

Steps: Convert quote to job.

Expected result: Job is created once, references quote/customer/site, and shows material requirements.

Failure result: Duplicate job on repeated submit.

Evidence:

Pass or fail:

## UAT-12 Material Requirements

Preconditions: Job exists from quote with material lines.

User role: Manager or procurement user.

Steps: Open job detail and generate/view material requirements.

Expected result: Required quantities match quote material/accessory lines.

Failure result: Missing requirements or incorrect quantities.

Evidence:

Pass or fail:

## UAT-13 Requisition

Preconditions: Job has material requirements.

User role: Procurement user.

Steps: Create draft requisition from job requirements, submit, and approve.

Expected result: Requisition lines link to material requirements and duplicate submission does not duplicate requisitions.

Failure result: Duplicate requisitions or broken requirement links.

Evidence:

Pass or fail:

## UAT-14 Purchase Order

Preconditions: Approved requisition exists.

User role: Procurement user.

Steps: Create purchase order, submit, approve, and issue.

Expected result: PO lines link to requisition/material requirements and valid statuses update ordered quantities.

Failure result: Draft/cancelled PO counts as ordered.

Evidence:

Pass or fail:

## UAT-15 Goods Receipt

Preconditions: Issued purchase order exists.

User role: Inventory user.

Steps: Attempt to create goods receipt from PO.

Expected result: `BLOCKED` in current build because Goods Receipt is not implemented.

Failure result: Any hidden/mock receipt is mistaken for real stock posting.

Evidence:

Pass or fail:

## UAT-16 Stock Reservation

Preconditions: Job has requirements and stock balance exists.

User role: Inventory user or manager.

Steps: Reserve stock from job detail.

Expected result: Available stock decreases, on-hand stock does not decrease, and requirement allocated quantity updates.

Failure result: Reservation exceeds availability or duplicate reservation double-allocates.

Evidence:

Pass or fail:

## UAT-17 Material Issue

Preconditions: Stock is reserved for job.

User role: Inventory user or manager.

Steps: Issue reserved stock to job.

Expected result: Reserved and on-hand quantities decrease, issued quantity increases, and requirement status updates.

Failure result: Issue without reservation or duplicate issue changes stock twice.

Evidence:

Pass or fail:

## UAT-18 Installation Scheduling

Preconditions: Job exists.

User role: Scheduler or manager.

Steps: Enter scheduled start/end, access notes, and work notes.

Expected result: Job schedule saves and appears on job detail.

Failure result: End before start accepted or schedule fails.

Evidence:

Pass or fail:

## UAT-19 Job Completion

Preconditions: Job exists and is not cancelled.

User role: Installer or manager.

Steps: Enter customer sign-off name and completion notes, then mark complete.

Expected result: Job status becomes completed and audit trail exists.

Failure result: Cancelled job can be completed or completion lacks audit evidence.

Evidence:

Pass or fail:

## UAT-20 Invoice

Preconditions: Job is completed.

User role: Finance user or manager.

Steps: Create invoice from job.

Expected result: Invoice is created once, subtotal/VAT/total come from server-side quote values, and deposit is credited.

Failure result: Duplicate active invoice or VAT equals zero for a VAT-rated quote.

Evidence:

Pass or fail:

## UAT-21 Partial Payment

Preconditions: Invoice has balance due.

User role: Finance user or manager.

Steps: Record a partial payment below the balance.

Expected result: Invoice status becomes `PARTIALLY_PAID`, balance decreases, and duplicate submit does not duplicate payment.

Failure result: Payment duplicates or balance is wrong.

Evidence:

Pass or fail:

## UAT-22 Final Payment

Preconditions: Partially paid invoice exists.

User role: Finance user or manager.

Steps: Record payment for remaining balance.

Expected result: Invoice status becomes `PAID` and balance becomes zero.

Failure result: Invoice remains outstanding or overpayment is accepted.

Evidence:

Pass or fail:

## UAT-23 Profitability

Preconditions: Completed paid job exists.

User role: Manager or finance user.

Steps: Open job profitability report.

Expected result: `BLOCKED` in current build because job profitability reporting is not implemented.

Failure result: Browser-only or mock profitability is treated as authoritative.

Evidence:

Pass or fail:

## UAT-24 Permissions

Preconditions: Seeded owner, manager, and staff users exist.

User role: Read-only or restricted staff.

Steps: Attempt forbidden API actions directly and through UI.

Expected result: API rejects unauthorized actions, not only hidden buttons.

Failure result: Restricted user performs manage/write/approve/finance actions.

Evidence:

Pass or fail:

## UAT-25 Tenant Isolation

Preconditions: At least two tenants exist.

User role: Tenant A user.

Steps: Attempt to read/update Tenant B IDs for lead, customer, site, survey, estimate, quote, job, requisition, PO, stock, invoice, and payment.

Expected result: Safe forbidden or not-found responses.

Failure result: Tenant B data is visible, mutable, or inferable.

Evidence:

Pass or fail:

Current build note: Seed does not yet include Tenant B, so this UAT is blocked until a second seeded tenant and full isolation fixtures exist.
