import { eq, sql } from 'drizzle-orm';
import { compass, compassObservations } from '../db/schema';
import type { CompassObservationCategory, CompassObservationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { compassGet } from '../queries/compassGet';

interface CompassObservationCreateInput {
    sourceChatMessageId: string;
    category: CompassObservationCategory;
    content: string;
    confidence: number | null;
    analyzerModelId: string | null;
}

// Persists one observation row and bumps the parent compass's
// `observationsSinceSynthesis` counter. Used by the analyzer job; not exposed
// as a GraphQL mutation — the AI writes compass data, not the user.
//
// Returns the row id so the analyzer can log what it produced for a given
// admin message in one place.
export async function compassObservationCreate(input: CompassObservationCreateInput, serverRuntime: ServerRuntime): Promise<string> {
    const insert: CompassObservationCreate = {
        observationId: crypto.randomUUID(),
        sourceChatMessageId: input.sourceChatMessageId,
        category: input.category,
        content: input.content,
        confidence: input.confidence,
        analyzerModelId: input.analyzerModelId,
        dismissedAt: null,
    };

    await serverRuntime.db.transaction(async (transaction) => {
        // Make sure the compass row exists before we increment it — first
        // run on a fresh DB needs the seed insert.
        const compassRow = await compassGet(transaction);
        await transaction.insert(compassObservations).values(insert);
        await transaction
            .update(compass)
            .set({ observationsSinceSynthesis: sql`${compass.observationsSinceSynthesis} + 1`, updatedAt: new Date() })
            .where(eq(compass.compassId, compassRow.compassId));
    });

    return insert.observationId;
}
