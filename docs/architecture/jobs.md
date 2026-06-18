# Jobs (Background Processing)

## Context

The application needs two categories of background work:

1. **Recurring jobs** — run on a cron schedule (e.g., cleanup stale sessions every 6 hours)
2. **Queued/scheduled jobs** — enqueued programmatically to run at a specific future time (e.g., send a reminder 24 hours after signup)

## Decision

Use **pg-boss** — a PostgreSQL-backed job queue that supports both cron scheduling and delayed/scheduled jobs.

## Alternatives Considered

| Option                             | Pros                                                                                 | Cons                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **pg-boss** (chosen)               | No extra infra, uses existing PG, transactional consistency, supports both job types | Lower throughput than Redis-backed queues              |
| **BullMQ + Redis**                 | Higher throughput, mature ecosystem                                                  | Requires Redis infrastructure, separate failure domain |
| **Custom PG polling**              | Full control, no dependency                                                          | Maintenance burden, reinventing the wheel              |
| **External service (Trigger.dev)** | Managed, dashboard                                                                   | External dependency, cost, vendor lock-in              |

## Architecture

Jobs are integrated into the `ServerRuntime` DI container via `serverRuntime.jobs.enqueue()`. The worker (handler registration) runs as a
parallel consumer with its own `ServerRuntime` instance.

```
src/server/jobs/
├── boss.ts                     pg-boss singleton, ensureBossStarted(), jobEnqueue()
├── index.ts                    Worker registration (ensureJobsStarted), re-exports handlers
├── types.ts                    JobHandler, RecurringJobDefinition, QueuedJobDefinition
├── jobDefinitions.ts           Central registry (all jobs imported here)
└── handlers/
    ├── staleSessionsCleanup.ts Example recurring job
    └── signupReminderSend.ts   Example queued job
```

### Key Files

- **`boss.ts`** — pg-boss singleton (`ensureBossStarted`) and the `jobEnqueue` function used by `ServerRuntime`. Has no dependencies on
  handlers or `serverRuntimeCreate`, breaking circular imports.
- **`index.ts`** — Worker startup (`ensureJobsStarted`): registers handlers from `jobDefinitions` and sets up cron schedules. Called from
  `src/server/graphql/server.ts` alongside Apollo.
- **`ServerRuntime.jobs.enqueue`** — Wired in `serverRuntimeCreate.ts`, delegates to `jobEnqueue` from `boss.ts`. Provides full type safety
  via the definition's generic parameter.

### Initialization

pg-boss uses the **lazy start** pattern (matching Apollo Server's `ensureServerStarted()`):

1. `ensureJobsStarted()` is called inside `ensureServerStarted()` in `src/server/graphql/server.ts`
2. On first call: creates the pg-boss instance, calls `boss.start()`, registers all handlers, sets up cron schedules
3. Subsequent calls are no-ops (idempotent)
4. The singleton is stored on `globalThis` to survive Vite HMR in development

### Schema

pg-boss manages its own tables in a `pgboss` PostgreSQL schema. These are created automatically by `boss.start()` — no Drizzle migration
required.

### Shutdown

`SIGTERM` and `SIGINT` handlers call `boss.stop({ graceful: true })`, which waits for in-progress jobs to complete before shutting down.

## How to Add a New Job

### Recurring Job

1. Create a handler file in `src/server/jobs/handlers/{entityAction}.ts`:

```typescript
import type { RecurringJobDefinition } from '../types';

export const myRecurringJob: RecurringJobDefinition = {
  kind: 'recurring',
  name: 'my-recurring-job',
  cron: '0 */6 * * *', // every 6 hours
  handler: async ({ serverRuntime }) => {
    // implementation
  },
};
```

2. Add it to `src/server/jobs/jobDefinitions.ts`

### Queued/Scheduled Job

1. Create a handler file:

```typescript
import type { QueuedJobDefinition } from '../types';

interface MyJobData {
  userId: string;
}

export const myQueuedJob: QueuedJobDefinition<MyJobData> = {
  kind: 'queued',
  name: 'my-queued-job',
  handler: async ({ data, serverRuntime }) => {
    // implementation using data.userId
  },
};
```

2. Add it to `src/server/jobs/jobDefinitions.ts`
3. Re-export from `src/server/jobs/index.ts` for ergonomic imports
4. Enqueue from commands via `serverRuntime.jobs.enqueue(myQueuedJob, data, options)`

### Enqueuing Jobs

Jobs are enqueued via `serverRuntime.jobs.enqueue()`. The definition's generic parameter provides full type safety on the data payload:

```typescript
import { signupReminderSend } from '../jobs';

export async function userCreate(..., serverRuntime: ServerRuntime) {
  await serverRuntime.jobs.enqueue(
    signupReminderSend,
    { userId: user.userId, email: user.email },
    { startAfter: reminderDate },
  );
}
```

### Transactional Enqueue

Pass a Drizzle transaction via the `transaction` option to enqueue a job atomically with your business logic. If the transaction rolls back,
the job is never created:

```typescript
await serverRuntime.db.transaction(async (transaction) => {
  await transaction.insert(orders).values(order);
  await serverRuntime.jobs.enqueue(
    signupReminderSend,
    { userId: order.userId, email: order.email },
    {
      startAfter: reminderDate,
      transaction: transaction,
    },
  );
});
```

Under the hood this uses pg-boss's `fromDrizzle(transaction, sql)` adapter — no separate connection is needed for the enqueue.

## Consequences

- No additional infrastructure beyond PostgreSQL
- Jobs are transactionally enqueued alongside business data (same database)
- Job handlers are plain async functions — testable without pg-boss
- Single-process deployment: the worker runs in the same Node.js process as the web server
- If higher throughput is needed in the future, pg-boss can be replaced with BullMQ without changing the handler interface
