# Open-Source Module Harvesting Plan

Prepared: July 18, 2026

## Objective
Phase D can accelerate delivery by harvesting ideas, isolated utilities, tests, and document-layout patterns from mature open-source procurement repositories. The Tradesperson architecture remains authoritative. No external ERP will be imported wholesale.

## Allowed Harvesting Modes
- `Package dependency`
- `Isolated file adaptation`
- `Pattern reference`
- `Sidecar service`
- `Reject`

## Licence Policy
Preferred:
- MIT
- Apache-2.0
- BSD

Restricted:
- GPL
- AGPL
- BSL
- source-available licences
- unlicensed code
- unclear licensing

Restricted repositories may still inform architecture as pattern references, but their code must not be copied into the SaaS without explicit approval.

## Assessment Register

| Repository | Capability | Stack | Licence | Release/commit status checked July 18, 2026 | Adoption level | Decision | Risks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [frappe/erpnext](https://github.com/frappe/erpnext) | Mature requisition, RFQ, PO, receipt, and accounting workflow coverage with a strong test corpus | Python, Frappe | GPL-3.0 | Active GitHub repo, current public default branch visible July 18, 2026 | High | Pattern reference only | GPL prevents code adaptation into this SaaS |
| [OCA/purchase-workflow](https://github.com/OCA/purchase-workflow) | Granular purchase-order workflow add-ons including approval block, ETA/ETD, archiving, and manual delivery planning | Python, Odoo | AGPL-3.0 at repo level, some module-level variance | Active GitHub repo, current public branch visible July 18, 2026 | High in Odoo ecosystem | Pattern reference only | AGPL and module-by-module licence complexity block direct copying |
| [openboxes/openboxes](https://github.com/openboxes/openboxes) | Supply-chain purchasing and receipt workflow patterns, delivery and receiving concepts | Groovy, Grails | EPL-1.0 | Active public repo visible July 18, 2026 | Moderate | Pattern reference only | Weak fit for TypeScript stack; EPL review needed before any code reuse |
| [inforkgodara/purchase-orders](https://github.com/inforkgodara/purchase-orders) | Small PO-centric CRUD and print-style structure ideas | JavaScript, web app | MIT | Public GitHub repo visible July 18, 2026 | Low | Pattern reference; possible isolated UI adaptation after review | Lower maturity; likely useful only for print-page ideas |
| [amandareilly/purchase-order-app](https://github.com/amandareilly/purchase-order-app) | Small MIT purchase-order sample app for basic screen and data-entry flow ideas | JavaScript | MIT | Public GitHub repo visible July 18, 2026 | Low | Pattern reference | Low adoption and unclear production rigor |
| [lehigh-university-libraries/purchase-request-workflow-proxy-server](https://github.com/lehigh-university-libraries/purchase-request-workflow-proxy-server) | Request intake and approval-routing ideas around purchase requests | Java, Spring | Apache-2.0 | Public GitHub repo visible July 18, 2026 | Moderate niche | Pattern reference | Domain fit is library acquisitions, not commercial flooring procurement |

## Recommended Harvesting Targets

### Workflow and state ideas
- ERPNext:
  - requisition to PO conversion checkpoints
  - lifecycle and approval test cases
  - supplier-facing document sections
- OCA purchase-workflow:
  - approval block concepts
  - manual delivery planning ideas
  - open quantity and pending quantity patterns

### UI and print patterns
- MIT-licensed PO sample apps:
  - line-item table density
  - supplier-facing print layouts
  - field grouping for address, dates, and totals

### Not recommended for code import
- large ERP frameworks with copyleft licences
- sidecar procurement engines that would take ownership away from the existing API and Prisma model

## Harvesting Rules For This Repository
- Any adapted file must keep licence provenance notes in the implementation plan or PR notes.
- Prefer internal rewrites from observed patterns rather than direct code lifts.
- If a package dependency is considered later, it must be:
  - permissively licensed
  - actively maintained
  - technically aligned with Node, TypeScript, Nest, Next, Prisma, and PostgreSQL
- Approval and numbering logic should stay first-party because they are core multi-tenant business rules.

## Initial Practical Use In Phase D
- Use mature ERP repositories only to validate lifecycle completeness, negative tests, and supplier-facing print sections.
- Use the MIT sample apps only to compare field grouping and printable line layouts.
- Do not import ORM models, business services, or vendor-specific workflow engines from external repositories.
