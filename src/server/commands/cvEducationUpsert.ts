import { eq } from 'drizzle-orm';
import { cvEducation } from '../db/schema';
import type { CvEducationCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvEducationUpsertArgs, GqlSCvEducation, GqlSSession } from '../graphql/generated';
import { toGqlCvEducation } from '../mappers/toGqlCvEducation';

export async function cvEducationUpsert(
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
        institutionDe: input.institutionDe,
        institutionEn: input.institutionEn,
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
        if (input.cvEducationId) {
            const [updated] = await serverRuntime.db
                .update(cvEducation)
                .set(payload)
                .where(eq(cvEducation.cvEducationId, input.cvEducationId))
                .returning();
            if (!updated) throw new Error(`cvEducationUpsert: row ${input.cvEducationId} not found`);
            return toGqlCvEducation(updated);
        }
        const [inserted] = await serverRuntime.db.insert(cvEducation).values(payload).returning();
        if (!inserted) throw new Error('cvEducationUpsert: insert returned no rows');
        return toGqlCvEducation(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
