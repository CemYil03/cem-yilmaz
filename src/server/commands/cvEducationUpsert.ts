import { eq } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { CvEducationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvEducationUpsertArgs, GqlSCvEducation, GqlSSession } from '../graphql/generated';
import { toGqlCvEducation } from '../mappers/toGqlCvEducation';

export async function cvEducationUpsert(
    userId: string,
    args: GqlSAdminMutationCvEducationUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCvEducation> {
    const { input } = args;
    const cvEducationId = input.cvEducationId ?? crypto.randomUUID();
    const payload: CvEducationCreate = {
        cvEducationId,
        degreeDe: input.degreeDe,
        degreeEn: input.degreeEn,
        institution: input.institution,
        subjectDe: input.subjectDe,
        subjectEn: input.subjectEn,
        startDate: input.startDate ?? null,
        endDate: input.endDate,
        notesDe: input.notesDe,
        notesEn: input.notesEn,
        position: input.position,
        updatedAt: new Date(),
    };

    try {
        let row;
        if (input.cvEducationId) {
            const [updated] = await serverRuntime.db
                .update(cvEducation)
                .set(payload)
                .where(eq(cvEducation.cvEducationId, input.cvEducationId))
                .returning();
            if (!updated) throw new Error(`cvEducationUpsert: row ${input.cvEducationId} not found`);
            row = updated;
        } else {
            const [inserted] = await serverRuntime.db.insert(cvEducation).values(payload).returning();
            if (!inserted) throw new Error('cvEducationUpsert: insert returned no rows');
            row = inserted;
        }
        await serverRuntime.publish.userUpdates({ userId });
        return toGqlCvEducation(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
