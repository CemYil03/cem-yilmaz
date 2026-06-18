import { MockLanguageModelV3 } from 'ai/test';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { vi } from 'vitest';

import type { Log, User, UserCreate } from '../db/schema';
import * as schema from '../db/schema';
import { logs, sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { loggerCreate } from '../utils/loggerCreate';
import { config } from 'dotenv';

config({ path: ['.env.test'] });

// eslint-disable-next-line no-restricted-syntax
const databaseUrl = process.env.DATABASE_URL ?? '';

export const testDb = drizzle(databaseUrl, { schema });
export const testLogger = loggerCreate(testDb);

// Single source of truth for the LLM stub used by every command test that
// builds a `ServerRuntime`. The `notImplemented` defaults from `ai/test` throw
// if a test ever reaches the model — exactly what we want, because no unit
// test should burn real tokens. Tests that need the agent to run can pass
// `doGenerate` / `doStream` overrides via the constructor; the typical command
// test mocks `chatAssistantTurnRunDetached` instead, so the model is never
// invoked at all.
function aiForTest(): ServerRuntime['ai'] {
    return {
        userConversationModel: () => new MockLanguageModelV3(),
    };
}

// Shared `ServerRuntime` stub for command tests. Real DB + log; every runtime
// function is a `vi.fn()` so tests can introspect via
// `vi.mocked(stubRuntime.publish.chatUpdates).mock.calls` /
// `toHaveBeenCalledWith(...)`. `publish.*` channels are silent no-ops so tests
// can observe what the command published without per-test overrides.
function serverRuntimeStubCreate(): ServerRuntime {
    return {
        db: testDb,
        log: testLogger,
        subscribe: {
            to: vi.fn<ServerRuntime['subscribe']['to']>(() => {
                throw new Error('subscribe.to not used');
            }),
        },
        publish: {
            userUpdates: vi.fn<ServerRuntime['publish']['userUpdates']>(async () => {}),
            chatUpdates: vi.fn<ServerRuntime['publish']['chatUpdates']>(async () => {}),
        },
        jobs: {
            // `enqueue` is generic over `TData`; vitest's `Mock<T>` doesn't
            // round-trip generic call signatures, so we cast through the
            // ServerRuntime type. Tests that need to assert on it reach the
            // mock interface via `vi.mocked(stubRuntime.jobs.enqueue)`.
            enqueue: vi.fn(async () => {
                throw new Error('jobs.enqueue not used');
            }) as unknown as ServerRuntime['jobs']['enqueue'],
        },
        ai: aiForTest(),
        browser: {
            capture: vi.fn<ServerRuntime['browser']['capture']>(() => {
                throw new Error('browser.capture not used');
            }),
        },
    };
}

interface CommandSetup {
    serverRuntime: ServerRuntime;
    requestingSession: GqlSSession;
}

interface CommandSetupWithUser extends CommandSetup {
    user: User;
}

// One-line setup for command tests — see `commandSetup.withUser` for the
// variant that also seeds a user row. Plain `commandSetup()` persists a
// session row whose `userId` is null; that's the right shape for tests that
// exercise "user not found" paths or that seed users themselves with extra
// context. The session is always persisted so the `logs.sessionId` FK
// (`sessions.sessionId`) holds when the command logs an error.
async function commandSetupBase(): Promise<CommandSetup> {
    const sessionId = crypto.randomUUID();
    await testDb.insert(sessions).values({ sessionId });

    const requestingSession = {
        gqlTypeName: 'Session',
        sessionId,
        userId: crypto.randomUUID(),
    } as unknown as GqlSSession;
    return { serverRuntime: serverRuntimeStubCreate(), requestingSession };
}

async function commandSetupWithUser(overrides: Partial<UserCreate> = {}): Promise<CommandSetupWithUser> {
    const userId = overrides.userId ?? crypto.randomUUID();
    const sessionId = crypto.randomUUID();

    // `sessions.userId` references `users.userId`, so the user has to land
    // before the session — Postgres checks the FK at statement time. The two
    // writes can't run in parallel.
    const [user] = await testDb
        .insert(users)
        .values({ userId, name: 'test-user', ...overrides })
        .returning();
    if (!user) throw new Error('commandSetup.withUser: insert returned no rows');

    await testDb.insert(sessions).values({ sessionId, userId: user.userId });

    const requestingSession = {
        gqlTypeName: 'Session',
        sessionId,
        userId: user.userId,
    } as unknown as GqlSSession;
    return { serverRuntime: serverRuntimeStubCreate(), requestingSession, user };
}

export const commandSetup: {
    (): Promise<CommandSetup>;
    withUser: (overrides?: Partial<UserCreate>) => Promise<CommandSetupWithUser>;
} = Object.assign(commandSetupBase, { withUser: commandSetupWithUser });

// `testLog` writes are dispatched async via `loggerCreate`'s pending queue.
// We drain before reading; otherwise the SELECT can race the INSERT and
// return nothing.
export async function findLogsForSession(sessionId: string): Promise<Log[]> {
    await testLogger.drain();
    return testDb.select().from(logs).where(eq(logs.sessionId, sessionId));
}
