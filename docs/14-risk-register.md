# Risk Register

| Risk                                            | Impact   | Mitigation                                                              |
| ----------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| Tenant leakage through missed query scoping     | Critical | central tenant-aware repositories, tests, audit reviews                 |
| Quote calculation defects                       | High     | dedicated pricing domain service, decimal-safe arithmetic, golden tests |
| Stock and purchasing drift                      | High     | transactional stock movement model, reservations as first-class records |
| Scope explosion across too many trade verticals | High     | flooring-first MVP and reusable module contracts                        |
| Over-complex permissions                        | Medium   | permission grouping, default role presets, admin tooling                |
| Weak seed data reducing demo value              | Medium   | narrative demo workflow and validation tests                            |
| Async job duplication                           | Medium   | idempotency keys, dedupe, dead-letter monitoring                        |
| Document and signature storage exposure         | High     | signed URLs, private buckets, access policies                           |
| ERP UI becoming slow under dense tables         | Medium   | server pagination, query optimization, TanStack Table patterns          |
| Platform support overreach into tenant data     | High     | explicit support grant, time-bound impersonation, audit logs            |
