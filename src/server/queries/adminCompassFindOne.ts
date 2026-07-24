import { eq } from 'drizzle-orm';
import { COMPASS_SINGLETON_ID } from '../agents/compassConfig';
import type { Database, DatabaseTransaction } from '../db';
import { compass } from '../db/schema';
import type { Compass, CompassCreate } from '../db/schema';

// Loads the singleton `Compass` row, creating it lazily if it doesn't exist
// yet. Callers can rely on this returning a row — they never need to handle
// "no compass yet". The synthesizer, the agent's summary read, and the
// `/workspace/compass` page all funnel through here.
export async function adminCompassFindOne(dbOrTx: Database | DatabaseTransaction): Promise<Compass> {
    const [existing] = await dbOrTx.select().from(compass).where(eq(compass.compassId, COMPASS_SINGLETON_ID)).limit(1);
    if (existing) return existing;

    const seed: CompassCreate = {
        compassId: COMPASS_SINGLETON_ID,
        summary: '',
        prose: '',
        psychology: '',
        synthesizedAt: null,
        synthesisModelId: null,
        observationsSinceSynthesis: 0,
    };
    const [inserted] = await dbOrTx.insert(compass).values(seed).onConflictDoNothing().returning();
    // `onConflictDoNothing` returns `[]` if a parallel call inserted between
    // our SELECT and INSERT — re-read in that case so we still return a row.
    if (inserted) return inserted;
    const [raced] = await dbOrTx.select().from(compass).where(eq(compass.compassId, COMPASS_SINGLETON_ID)).limit(1);
    if (!raced) {
        throw new Error('compassGet: failed to load or seed the singleton compass row');
    }
    return raced;
}
