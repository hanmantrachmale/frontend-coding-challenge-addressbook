# Backend Standards

## Controllers

Controllers are thin.

Allowed:

- Authorization
- Validation
- Request mapping

Not allowed:

- Business logic
- Database access
- AI provider calls

## Application Layer

Contains:

<!-- - Commands
- Queries
- Handlers
- Validators -->

## Domain Layer

Contains:

- Entities
- Value Objects
- Domain Events

Domain layer must never reference Infrastructure.

## Infrastructure Layer

Contains:

- EF Core
<!-- - Azure OpenAI
- AI Foundry
- External APIs -->