# Angular Standards

## Component Types

Pages:
features/*/pages

Reusable:
features/*/components

## State Management

Use Angular Signals.

Avoid component state sprawl.

## Change Detection

Always:

ChangeDetectionStrategy.OnPush

## API Access

Only services call HttpClient.

Components never call HttpClient directly.

## SignalR

All SignalR access goes through:

ChatRealtimeService