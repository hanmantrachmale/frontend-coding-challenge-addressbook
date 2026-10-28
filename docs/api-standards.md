# API Standards

## Purpose

Defines standards for all APIs in the platform.

---

# API Style

Use REST APIs.

Examples:

GET /api/conversations

GET /api/conversations/{id}

POST /api/conversations

PUT /api/conversations/{id}

DELETE /api/conversations/{id}

---

# Naming Conventions

Resources must be plural.

Good:

/api/conversations

/api/users

/api/messages

Bad:

/api/conversation

/api/getConversation

/api/createConversation

---

# HTTP Verbs

GET

Retrieve data.

POST

Create resources.

PUT

Replace resources.

PATCH

Partial updates.

DELETE

Delete resources.

---

# Response Types

Always return DTOs.

Never return:

- EF Entities
- Domain Entities

Bad:

return Conversation;

Good:

return ConversationDto;

---

# API Versioning

All APIs must support versioning.

Example:

/api/v1/conversations

Future:

/api/v2/conversations

---

# Response Envelope

Success:

{
  "id": "123",
  "name": "Chat Session"
}

Avoid unnecessary wrappers.

Bad:

{
  "success": true,
  "data": {
  }
}

Use native HTTP semantics.

---

# Error Responses

Use ProblemDetails.

Example:

{
  "type": "...",
  "title": "Validation Failed",
  "status": 400,
  "traceId": "..."
}

Never return:

{
  "error": "something went wrong"
}

---

# Pagination

Required for collections.

Example:

GET /api/conversations?page=1&pageSize=20

Response:

{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 100
}

---

# Filtering

Example:

GET /api/conversations?status=active

---

# Sorting

Example:

GET /api/conversations?sortBy=createdUtc

GET /api/conversations?sortDirection=desc

---

# OpenAPI

Swagger documentation is mandatory.

Every endpoint must include:

- Summary
- Description
- Response types

---

# Validation

Validation errors return:

400 Bad Request

Using ProblemDetails.

---

# Authentication

Protected APIs require:

[Authorize]

Public endpoints must be explicitly documented.

---

# Correlation IDs

All requests must support:

X-Correlation-Id

Log correlation IDs throughout the request lifecycle.

---

# Idempotency

Required for critical operations.

Examples:

- Payments
- Agent Actions
- Long-running workflows

Use:

Idempotency-Key

header.

---

# Async Operations

Long-running operations should return:

202 Accepted

Example:

Agent execution

Document indexing

Knowledge ingestion

---

# Streaming

Use SignalR for:

- Token streaming
- Agent progress
- Notifications

Use REST for:

- CRUD
- Queries
- Configuration

---

# Status Codes

200 OK

Successful retrieval.

201 Created

Resource created.

202 Accepted

Long-running operation started.

204 No Content

Delete successful.

400 Bad Request

Validation failure.

401 Unauthorized

Authentication required.

403 Forbidden

Access denied.

404 Not Found

Resource not found.

409 Conflict

Concurrency issue.

429 Too Many Requests

Rate limit exceeded.

500 Internal Server Error

Unexpected failure.

---

# OpenAPI Client Generation

Frontend clients should be generated from OpenAPI.

Preferred:

NSwag

Avoid manually duplicating DTOs.

Backend is the source of truth.

---

# Performance

All endpoints must:

- Support CancellationToken
- Use async/await
- Avoid N+1 queries

Read operations should use:

AsNoTracking()

where appropriate.

---

# API Review Checklist

Before merging:

✅ Endpoint documented

✅ Validation implemented

✅ Authorization implemented

✅ DTOs used

✅ OpenAPI updated

✅ Logging added

✅ Tests added

✅ CancellationToken supported

✅ Status codes correct

✅ ProblemDetails used