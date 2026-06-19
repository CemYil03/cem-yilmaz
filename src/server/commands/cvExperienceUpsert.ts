import { eq } from 'drizzle-orm';
import { cvExperience } from '../db/schema';
import type { CvExperienceCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutationCvExperienceUpsertArgs, GqlSCvExperience, GqlSSession } from '../graphql/generated';
import { toGqlCvExperience } from '../mappers/toGqlCvExperience';

// Two-phase upsert: Phase 1 builds the insert/update payload off the GraphQL
// input, Phase 2 runs the single DB call wrapped in try/catch. When `input.cvExperienceId`
// is supplied the row with that id is updated; otherwise a new row is created.
// `position` is written verbatim — the editor sets it explicitly, and a separate
// `cvExperienceReorder` mutation moves rows around without re-saving every field.
export async function cvExperienceUpsert(
    args: GqlSAdminMutationCvExperienceUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCvExperience> {
    const { input } = args;

    // Phase 1 — Payload construction
    const cvExperienceId = input.cvExperienceId ?? crypto.randomUUID();
    const now = new Date();
    const payload: CvExperienceCreate = {
        cvExperienceId,
        roleDe: input.roleDe,
        roleEn: input.roleEn,
        companyDe: input.companyDe,
        companyEn: input.companyEn,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        descriptionDe: input.descriptionDe,
        descriptionEn: input.descriptionEn,
        technologies: input.technologies,
        managerName: input.managerName ?? null,
        position: input.position,
        updatedAt: now,
    };

    // Phase 2 — Transactional execution (single statement → no transaction needed)
    try {
        if (input.cvExperienceId) {
            const [updated] = await serverRuntime.db
                .update(cvExperience)
                .set(payload)
                .where(eq(cvExperience.cvExperienceId, input.cvExperienceId))
                .returning();
            if (!updated) {
                throw new Error(`cvExperienceUpsert: row ${input.cvExperienceId} not found`);
            }
            return toGqlCvExperience(updated);
        }

        const [inserted] = await serverRuntime.db.insert(cvExperience).values(payload).returning();
        if (!inserted) {
            throw new Error('cvExperienceUpsert: insert returned no rows');
        }
        return toGqlCvExperience(inserted);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
