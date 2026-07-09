import { eq, sql } from 'drizzle-orm';
import { compass, compassInterviewMessages, compassInterviews, compassObservations } from '../db/schema';
import type { CompassObservationCategory, CompassObservationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { adminCompassFindOne } from '../queries/adminCompassFindOne';

// Exactly one of `sourceChatMessageId` / `sourceInterviewMessageId` is set.
// The analyzer branches on which kind of message it was enqueued for and
// fills the matching FK. Two-FK shape (rather than a single polymorphic
// reference) keeps the cascade rules and the joins per-source-kind trivial.
interface CompassObservationCreateInput {
    sourceChatMessageId: string | null;
    sourceInterviewMessageId: string | null;
    category: CompassObservationCategory;
    content: string;
    confidence: number | null;
    analyzerModelId: string | null;
}

// Persists one observation row, bumps the parent compass's
// `observationsSinceSynthesis` counter, and — when the source is an interview
// message — also bumps the interview's denormalized `observationCount` so
// the past-interviews list can render "N observations" without an aggregate
// per row. Used by the analyzer job; not exposed as a GraphQL mutation —
// the AI writes compass data, not the user.
export async function compassObservationCreate(input: CompassObservationCreateInput, serverRuntime: ServerRuntime): Promise<string> {
    if ((input.sourceChatMessageId === null) === (input.sourceInterviewMessageId === null)) {
        throw new Error('compassObservationCreate: exactly one of sourceChatMessageId / sourceInterviewMessageId must be set');
    }

    const insert: CompassObservationCreate = {
        observationId: crypto.randomUUID(),
        sourceChatMessageId: input.sourceChatMessageId,
        sourceInterviewMessageId: input.sourceInterviewMessageId,
        category: input.category,
        content: input.content,
        confidence: input.confidence,
        analyzerModelId: input.analyzerModelId,
        dismissedAt: null,
    };

    await serverRuntime.db.transaction(async (transaction) => {
        // Make sure the compass row exists before we increment it — first
        // run on a fresh DB needs the seed insert.
        const compassRow = await adminCompassFindOne(transaction);
        await transaction.insert(compassObservations).values(insert);
        await transaction
            .update(compass)
            .set({ observationsSinceSynthesis: sql`${compass.observationsSinceSynthesis} + 1`, updatedAt: new Date() })
            .where(eq(compass.compassId, compassRow.compassId));

        // Interview-sourced observation: bump the interview's
        // denormalized counter. Look up the interview id via the message.
        if (input.sourceInterviewMessageId) {
            const [parent] = await transaction
                .select({ interviewId: compassInterviewMessages.interviewId })
                .from(compassInterviewMessages)
                .where(eq(compassInterviewMessages.interviewMessageId, input.sourceInterviewMessageId))
                .limit(1);
            if (parent) {
                await transaction
                    .update(compassInterviews)
                    .set({ observationCount: sql`${compassInterviews.observationCount} + 1`, updatedAt: new Date() })
                    .where(eq(compassInterviews.interviewId, parent.interviewId));
            }
        }
    });

    return insert.observationId;
}
