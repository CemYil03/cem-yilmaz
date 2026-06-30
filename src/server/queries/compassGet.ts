import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { profile } from '../db/schema';
import type { Profile, ProfileCreate } from '../db/schema';
import { PROFILE_SINGLETON_ID } from '../agents/profileConfig';

// Loads the singleton `Profile` row, creating it lazily if it doesn't exist
// yet. Callers can rely on this returning a row — they never need to handle
// "no profile yet". The synthesizer, the agent's summary read, and the
// `/workspace/profile` page all funnel through here.
export async function profileGet(dbOrTx: Database | DatabaseTransaction): Promise<Profile> {
    const [existing] = await dbOrTx.select().from(profile).where(eq(profile.profileId, PROFILE_SINGLETON_ID)).limit(1);
    if (existing) return existing;

    const seed: ProfileCreate = {
        profileId: PROFILE_SINGLETON_ID,
        summary: '',
        prose: '',
        psychProfile: '',
        synthesizedAt: null,
        synthesisModelId: null,
        observationsSinceSynthesis: 0,
    };
    const [inserted] = await dbOrTx.insert(profile).values(seed).onConflictDoNothing().returning();
    // `onConflictDoNothing` returns `[]` if a parallel call inserted between
    // our SELECT and INSERT — re-read in that case so we still return a row.
    if (inserted) return inserted;
    const [raced] = await dbOrTx.select().from(profile).where(eq(profile.profileId, PROFILE_SINGLETON_ID)).limit(1);
    if (!raced) {
        throw new Error('profileGet: failed to load or seed the singleton profile row');
    }
    return raced;
}
