import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { compassInterviewMessages } from '../db/schema';
import type { CompassInterviewMessage } from '../db/schema';

// Single-row load for a compass-interview message. Used by the
// `compassInterviewUpdates` subscription resolver when a `messageAppended`
// event fires — the pg_notify wire payload only carries the id (see
// `compassInterviewUpdateWirePayload.ts`), so the resolver has to re-load
// the row on the graphql-server side before mapping it via
// `toGqlCompassInterviewMessage`.
//
// Returns `null` when the row isn't found; the caller decides whether
// that's an error or a benign race.
export async function compassInterviewMessageFindOne(
    dbOrTx: Database | DatabaseTransaction,
    interviewMessageId: string,
): Promise<CompassInterviewMessage | null> {
    const [row] = await dbOrTx
        .select()
        .from(compassInterviewMessages)
        .where(eq(compassInterviewMessages.interviewMessageId, interviewMessageId))
        .limit(1);
    return row ?? null;
}
