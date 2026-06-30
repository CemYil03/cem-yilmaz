import type { GqlSSession } from '../graphql/generated';

// Agent tools that wrap admin commands need the admin's `userId` so the
// underlying command can fan out `userUpdates` after a successful write.
// Inside the admin chat turn the orchestrator runs only after
// `guardAdminMutation` has already verified `requestingSession.userId` —
// so the value should always be present. A null here means the agent was
// wired up outside an admin scope (a bug), not a runtime expectation, so
// throwing is correct.
export function requireAdminUserId(session: GqlSSession): string {
    if (!session.userId) {
        throw new Error('requireAdminUserId: session has no userId — agent tool invoked outside an admin scope');
    }
    return session.userId;
}
