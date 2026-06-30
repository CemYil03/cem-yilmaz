import { eq } from 'drizzle-orm';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { users } from '../db/schema';
import type { GqlSAdminMutation, GqlSSession } from '../graphql/generated';

// Gates the workspace write namespace (`Mutation.admin`).
//
// Mirrors `guardAdmin` for the read namespace — same `isAdmin` column on
// the `Users` row drives both. Split into a dedicated guard so write-side
// policy can diverge later (e.g. narrower allowlist, CSRF posture) without
// dragging the read path along. See `guardAdmin.ts` for the rationale and
// `docs/architecture/workspace-access.md` for the broader access model.
export async function guardAdminMutation(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdminMutation> {
    if (!requestingSession.userId) {
        throw new Error('Unauthorized');
    }
    const [row] = await serverRuntime.db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.userId, requestingSession.userId))
        .limit(1);
    if (!row?.isAdmin) {
        throw new Error('Unauthorized');
    }
    return {} as GqlSAdminMutation;
}
