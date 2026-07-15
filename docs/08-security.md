# Security Specification

## Threat Model Priorities

- Tenant data leakage
- Privilege escalation
- Financial or stock integrity corruption
- Insecure document access
- Webhook spoofing
- Support-access abuse

## Controls

### Authentication

- Secure password hashing
- Passwordless and invite-based flows
- MFA-ready session architecture
- Session revocation and device tracking

### Authorization

- RBAC with explicit permissions
- Membership-scoped roles
- Branch-aware restrictions
- Platform and tenant access separated by design

### Tenant Isolation

- Server-resolved tenant context
- Tenant-aware repositories and query helpers
- Tenant ID on jobs, cache keys, audit events, and storage paths
- Tenant isolation tests for every major entity family

### Data Protection

- TLS in transit
- Encrypted infrastructure-managed storage at rest
- Signed document URLs
- Secrets in environment or secret manager only
- No raw card storage

### Operational Security

- Correlation IDs
- Append-only audit logs
- Login history
- Failed job visibility
- Webhook signature verification
- Rate limiting and secure headers

## GDPR Support

- Consent tracking
- Data export support
- Deletion request workflow
- Retention settings
- Auditable support access and privacy controls
