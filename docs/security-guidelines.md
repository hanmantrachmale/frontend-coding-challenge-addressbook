# Security Guidelines

## Purpose

This document defines mandatory security standards for all backend and frontend code.

Security is a non-functional requirement and must be considered in every implementation.

---

# Security Principles

1. Least Privilege
2. Defense in Depth
3. Zero Trust
4. Secure by Default
5. Fail Securely

---

# Authentication

## Approved Authentication

Only Microsoft Entra ID authentication is permitted.

Frontend:
- MSAL

Backend:
- JWT Bearer Authentication

Identity Provider:
- Microsoft Entra ID

Do not implement:

- Custom authentication
- Custom JWT generation
- Username/password storage

---

# Authorization

All API endpoints must be explicitly authorized.

Example:

[Authorize]

or

[Authorize(Policy = "Admin")]

Do not rely on:

- Frontend authorization
- Hidden UI controls
- Client-side validation

Backend authorization is mandatory.

---

# Secrets Management

Secrets must never be stored in:

- Source code
- appsettings.json
- angular environment files
- Git repositories

Use:

- Azure Key Vault
- Azure Managed Identity
- User Secrets (local development only)

Forbidden:

Connection Strings

API Keys

Access Tokens

Client Secrets

Passwords

---

# Logging

Never log:

- Passwords
- Access Tokens
- Refresh Tokens
- API Keys
- Personally Identifiable Information (PII)

Bad:

_logger.LogInformation(
    "Token: {Token}",
    token);

Good:

_logger.LogInformation(
    "User authenticated successfully");
    
---

# Input Validation

All external input must be validated.

Use:

FluentValidation

Examples:

- Request payloads
- Query parameters
- Route parameters
- Headers

Validation belongs in:

Application Layer

Not Controllers.

---

# Output Encoding

Frontend must assume all data is untrusted.

Never use:

innerHTML

Unless content is sanitized.

Bad:

<div [innerHTML]="response"></div>

Good:

{{ response }}

---

# SQL Injection Prevention

Use:

- EF Core
- Parameterized Queries

Forbidden:

string concatenation SQL

Bad:

var sql =
 $"SELECT * FROM Users WHERE Name='{name}'";

---

# Cross-Site Scripting (XSS)

Never render untrusted HTML.

Sanitize all rich content.

Avoid:

- Dynamic script execution
- eval()
- Function()

---

# Cross-Site Request Forgery (CSRF)

For cookie-based authentication:

- Enable CSRF protection

For JWT:

- Follow Microsoft guidance

---

# CORS

Allowed origins must be explicit.

Bad:

.AllowAnyOrigin()

Good:

.WithOrigins(
    "https://app.company.com")

---

# File Uploads

Allowed:

- PDF
- DOCX
- TXT

Validate:

- File type
- File size
- Content

Do not trust file extensions.

---

# AI Security

All AI interactions must be routed through:

IChatAgent

Never expose:

- Azure OpenAI keys
- Foundry credentials
- Internal prompts

Frontend must never communicate directly with AI providers.

---

# Prompt Injection Protection

AI-generated instructions are untrusted.

Never allow model output to:

- Execute commands
- Access databases
- Access secrets

Without explicit validation.

---

# Data Protection

Sensitive information:

- Must be encrypted in transit
- Must be encrypted at rest

Use HTTPS everywhere.

Never use HTTP.

---

# Dependencies

Only approved dependencies may be added.

Before introducing a dependency:

1. Justify business value.
2. Check security advisories.
3. Check maintenance status.

Avoid dependency sprawl.

---

# Security Review Checklist

Before merging code:

✅ Authorization implemented

✅ Validation implemented

✅ Logging reviewed

✅ No secrets committed

✅ No PII logged

✅ HTTPS enforced

✅ Dependency review completed

✅ Security tests completed