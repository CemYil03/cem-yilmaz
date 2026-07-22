import { and, desc, eq, ilike } from 'drizzle-orm';
import { logs } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAdminLogFindManyArgs, GqlSLog, GqlSSession } from '../graphql/generated';
import { toGqlLog } from '../mappers/toGqlLog';
import { escapeLike } from './chatSearchCondition';

// Read-only window onto the `Logs` table for the workspace viewer. Filters:
//
// - `level` narrows to one of `error | warn | info | debug`. Single-select on
//   the picker, so no `IN (...)` shape — `eq` is the right primitive.
// - `search` does a case-insensitive substring match on `message`. `%` and
//   `_` are escaped so a user typing `100%` doesn't accidentally match every
//   row. Postgres' default `ESCAPE` clause is backslash, so we escape backslash
//   too.
//
// `limit` defaults to 200 and is clamped at 1000 server-side — the viewer is
// triage, not bulk export, and an unbounded scan over `Logs` would dominate
// the API process. See `docs/architecture/logging.md`.

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

export async function adminLogFindMany(
    args: GqlSAdminAdminLogFindManyArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSLog[]> {
    const conditions = [
        args.level ? eq(logs.level, args.level) : undefined,
        args.search && args.search.length > 0 ? ilike(logs.message, `%${escapeLike(args.search)}%`) : undefined,
    ].filter((clause): clause is NonNullable<typeof clause> => clause !== undefined);
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    try {
        const rows = await serverRuntime.db
            .select()
            .from(logs)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(logs.createdAt))
            .limit(limit);
        return rows.map(toGqlLog);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
