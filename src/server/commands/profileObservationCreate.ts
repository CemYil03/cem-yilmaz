import { eq, sql } from 'drizzle-orm';
import { profile, profileObservations } from '../db/schema';
import type { ProfileObservationCategory, ProfileObservationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { profileGet } from '../queries/profileGet';

interface ProfileObservationCreateInput {
    sourceChatMessageId: string;
    category: ProfileObservationCategory;
    content: string;
    confidence: number | null;
    analyzerModelId: string | null;
}

// Persists one observation row and bumps the parent profile's
// `observationsSinceSynthesis` counter. Used by the analyzer job; not exposed
// as a GraphQL mutation — the AI writes profile data, not the user.
//
// Returns the row id so the analyzer can log what it produced for a given
// admin message in one place.
export async function profileObservationCreate(input: ProfileObservationCreateInput, serverRuntime: ServerRuntime): Promise<string> {
    const insert: ProfileObservationCreate = {
        observationId: crypto.randomUUID(),
        sourceChatMessageId: input.sourceChatMessageId,
        category: input.category,
        content: input.content,
        confidence: input.confidence,
        analyzerModelId: input.analyzerModelId,
        dismissedAt: null,
    };

    await serverRuntime.db.transaction(async (transaction) => {
        // Make sure the profile row exists before we increment it — first
        // run on a fresh DB needs the seed insert.
        const profileRow = await profileGet(transaction);
        await transaction.insert(profileObservations).values(insert);
        await transaction
            .update(profile)
            .set({ observationsSinceSynthesis: sql`${profile.observationsSinceSynthesis} + 1`, updatedAt: new Date() })
            .where(eq(profile.profileId, profileRow.profileId));
    });

    return insert.observationId;
}
