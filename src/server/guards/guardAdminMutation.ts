import { eq } from 'drizzle-orm';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { users } from '../db/schema';
import type { GqlSAdminMutation, GqlSSession } from '../graphql/generated';

// Gates the workspace write namespace (`Mutation.admin`).
//
// Read-side equivalent: the `User.admin` resolver in `resolversCreate.ts`
// runs the same `isAdmin` check but returns null instead of throwing, so the
// field can be composed off the public `currentSession.user` shape (drives
// the landing-page workspace link). The write side stays throw-on-mismatch —
// `Mutation.admin` is non-nullable and the resolver throws when the caller
// is not an admin so a bad request fails loudly. See
// `docs/architecture/workspace-access.md`.
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
