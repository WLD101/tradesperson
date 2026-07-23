# System Completion Map

Created on July 23, 2026 as the single working completion snapshot for the ERP foundation branch.

| Module | Classification | Backend | Web UI | Tests | Preview | Completion % | Blocker | Next action |
| ------ | -------------- | ------: | -----: | ----: | ------: | -----------: | ------- | ----------- |
| Authentication | Complete | 90 | 85 | 70 | 100 | 88 | Local preview depends on explicit tenant selection after sign-in | Keep seeded login and tenant selection stable while later modules expand |
| Tenant onboarding | Functional but incomplete | 65 | 40 | 20 | 30 | 45 | Tenant creation and activation flows are not yet a polished guided journey | Build the full create-business and first-user onboarding flow |
| Dashboard | Functional but incomplete | 70 | 70 | 20 | 90 | 68 | Summary widgets are still light operationally | Replace remaining generic summary sections with linked workflow KPIs |
| Leads | Functional but incomplete | 65 | 50 | 20 | 60 | 55 | Core CRM lifecycle past basic listing is still thin | Add lead detail actions and conversion into customers/jobs workflow |
| Customers | Functional but incomplete | 65 | 50 | 20 | 60 | 55 | Customer workflow is not yet connected into estimating and jobs | Add customer detail actions and downstream workflow links |
| Sites | Functional but incomplete | 75 | 75 | 35 | 85 | 73 | Site activity is not yet tied into job delivery | Connect sites into quote, job, and installation stages |
| Surveys | Functional but incomplete | 80 | 75 | 40 | 85 | 77 | Survey commercial handoff is missing | Feed survey results into estimate creation |
| Measurements | Functional but incomplete | 82 | 78 | 45 | 90 | 80 | Measurement outputs stop before costing | Build measurement import into estimate calculations |
| Product catalogue | Functional but incomplete | 88 | 84 | 55 | 90 | 85 | Catalogue is not yet fully consumed by estimating | Reuse catalogue rules in estimate material takeoff |
| Suppliers | Functional but incomplete | 90 | 88 | 55 | 95 | 89 | Supplier data is strong but not yet tied into finance/AP | Connect supplier commitments into finance workflows |
| Supplier pricing | Functional but incomplete | 92 | 88 | 70 | 95 | 90 | Pricing is operational but downstream estimate and margin usage is missing | Reuse current supplier prices in estimating and procurement cost decisions |
| Procurement | Functional but incomplete | 95 | 90 | 75 | 100 | 92 | Workflow is working end to end, but route polish and broader operational reporting remain | Start Estimate and Quote sprint using the now-working requisition-to-PO foundation |
| Estimates | Stub | 20 | 5 | 0 | 0 | 10 | No completed estimate workflow exists yet | Build estimate list, create, detail, edit, and survey measurement import |
| Quotes | Not started | 10 | 0 | 0 | 0 | 5 | Quote generation and approval flow are absent | Build quote generation from approved estimates |
| Jobs | Not started | 10 | 0 | 0 | 0 | 5 | No operational job delivery workflow exists yet | Create job list/detail and quote-to-job conversion |
| Scheduling | Not started | 5 | 0 | 0 | 0 | 2 | No scheduling domain surface exists yet | Build install calendar, team assignment, and rescheduling |
| Installations | Not started | 5 | 0 | 0 | 0 | 2 | No installation execution workflow exists yet | Build checklist, progress, snagging, and sign-off |
| Inventory | Deferred | 20 | 0 | 5 | 0 | 8 | Depends on procurement and jobs being stable first | Start only after procurement and job allocation workflows are live |
| Invoicing | Not started | 10 | 0 | 0 | 0 | 5 | No invoice generation flow exists yet | Build invoice creation from completed jobs and deposits |
| Payments | Not started | 10 | 0 | 0 | 0 | 5 | No payment capture or statement workflow exists yet | Add payment recording and outstanding balance tracking |
| Reporting | Stub | 25 | 10 | 5 | 10 | 15 | Current dashboards are not true reporting modules | Build operational dashboards after core workflows are complete |
| Roles and permissions | Functional but incomplete | 75 | 45 | 45 | 35 | 60 | Permission management UI is lighter than backend coverage | Add a fuller role editor and permission visibility screens |
| Settings | Functional but incomplete | 65 | 55 | 20 | 65 | 58 | Settings pages are present but limited in scope | Expand business, users, and subscription settings into real admin flows |

## Current focus

- Critical workflow status: partially operational through procurement, but estimate, quote, job, finance, and aftercare stages are still missing.
- Active sprint target: move from Procurement into Estimate and Quote without reopening completed procurement work unless regressions appear.
