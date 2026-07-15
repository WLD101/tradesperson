# Development Task Breakdown

## Foundation

- initialize pnpm workspace
- scaffold api, web, worker apps
- add shared packages
- configure TypeScript, linting, testing, env validation
- stand up Docker Compose services

## Identity And Tenancy

- model users, tenants, memberships, roles, permissions
- build auth flows
- implement tenant switcher support
- add tenant-aware guards and repository helpers

## CRM

- implement leads, customers, contacts, properties
- add activities, tasks, appointments
- build list and detail screens

## Surveys And Flooring

- implement surveys, rooms, sections, measurements
- add flooring rules and waste calculation engine
- support photo and signature capture

## Quotes

- implement quote builder
- persist quote versions
- add send, accept, and convert flows
- generate PDFs and portal views

## Jobs, Stock, And Purchasing

- implement jobs and work orders
- add scheduling and assignments
- add stock model, reservations, and movements
- add purchase orders and goods receipt

## Finance

- implement invoices, payments, credit notes
- wire profitability reporting

## Admin And Hardening

- build dashboard and reports
- build platform admin shell
- add observability, security reviews, and full e2e coverage
