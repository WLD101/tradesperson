# Backlog

## Critical
- **Full E2E Regression Suite**: Expand Playwright tests to cover exhaustive edge cases, form invalidations, and 4xx/5xx network failure scenarios across all CRUD operations. *(Estimate: 12-16 hours)*
- **Data Validation Handlers**: Ensure global UI notification boundaries elegantly display API constraint failures instead of silent console rejections. *(Estimate: 4-6 hours)*

## High
- **Inventory Subsystem Completion**: Re-introduce Generic Inventory Adjustments, Stock Transfers, and multi-warehouse mapping which were explicitly disabled for the MVP rollout. *(Estimate: 16-24 hours)*
- **Quotes & Jobs Detail Workflows**: Flesh out the detail, edit, and conversion (Estimate -> Quote -> Job) pages ensuring robust context propagation without orphaned records. *(Estimate: 8-12 hours)*
- **Requisitions Complex Forms**: Replace the placeholder test form handling for Requisitions with the comprehensive multi-line submission payload UI. *(Estimate: 6-8 hours)*

## Medium
- **Stripe / Billing Integration**: Activate subscription endpoints, billing gates, and tier restrictions within the frontend UI contexts. *(Estimate: 12-16 hours)*
- **Messaging & Notifications**: Activate the SMS/Email notification microservices and configure the respective WebSocket transports for real-time app notifications. *(Estimate: 16-20 hours)*
- **Advanced Dashboard Analytics**: Implement specialized data visualization charts utilizing AI-driven querying or standard metrics pipelines. *(Estimate: 8-12 hours)*

## Low
- **Design System Polish**: Continue auditing minor component inconsistencies, ensuring the dark/light mode toggle operates seamlessly without hydration flickering. *(Estimate: 4-6 hours)*
- **SEO & Static Page Generation**: Ensure public-facing customer portals and marketing landing zones meet performance and Core Web Vitals thresholds. *(Estimate: 8-10 hours)*
- **Customer Portal App**: Finish the React Native or dedicated PWA context for tradesperson clientele to self-service review approvals. *(Estimate: 24+ hours)*
