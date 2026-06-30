import { eq } from 'drizzle-orm';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { users } from '../db/schema';
import type { GqlSAdmin, GqlSSession } from '../graphql/generated';

// Gates the workspace read namespace (`Query.admin`).
//
// Admin membership is a single boolean on the `Users` row: `isAdmin`. The
// flag is set manually in the database for Cem's own accounts (the workspace
// surface is `noindex`, unlinked, and reachable only by typing `/workspace`,
// so a small hand-curated list of admin rows is the right fit for now).
// Anonymous sessions have `requestingSession.userId == null` and fail the
// first check; logged-in non-admin users fail the second.
//
// The empty-object cast is correct because every field on `Admin` has its
// own resolver in `resolversCreate.ts` that ignores `_parent`; the namespace
// is purely a routing label.
//
// Long-term, once GitHub OAuth lands, the flag can be reconciled from the
// allowlist at login time, and a dedicated `Admins` table is a clean upgrade
// because the column move is mechanical. See
// `docs/architecture/workspace-access.md`.
export async function guardAdmin(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSAdmin> {
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
    return {} as GqlSAdmin;
}
