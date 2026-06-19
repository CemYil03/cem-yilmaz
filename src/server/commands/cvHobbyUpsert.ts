import { eq } from 'drizzle-orm';
import { cvHobby } from '../db/schema';
import type { CvHobbyCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvHobbyUpsertArgs, GqlSCvHobby, GqlSSession } from '../graphql/generated';
import { toGqlCvHobby } from '../mappers/toGqlCvHobby';

export async function cvHobbyUpsert(
    args: GqlSAdminMutationCvHobbyUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCvHobby> {
    const { input } = args;
    const cvHobbyId = input.cvHobbyId ?? crypto.randomUUID();
    const payload: CvHobbyCreate = {
        cvHobbyId,
        textDe: input.textDe,
        textEn: input.textEn,
        since: input.since ?? null,
        position: input.position,
        updatedAt: new Date(),
    };

    try {
        if (input.cvHobbyId) {
            const [updated] = await serverRuntime.db.update(cvHobby).set(payload).where(eq(cvHobby.cvHobbyId, input.cvHobbyId)).returning();
            if (!updated) throw new Error(`cvHobbyUpsert: row ${input.cvHobbyId} not found`);
            return toGqlCvHobby(updated);
        }
        const [inserted] = await serverRuntime.db.insert(cvHobby).values(payload).returning();
        if (!inserted) throw new Error('cvHobbyUpsert: insert returned no rows');
        return toGqlCvHobby(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
