import { tool } from 'ai';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { projectRequests, projects } from '../db/schema';
import type { AdminProjectCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminProjectStatusSchema } from '../graphql/generated';
import type { GqlSAdminProjectCreate, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch create-or-update of projects. Every input with a `projectId` is
// updated; every input without one is inserted under a freshly-minted UUID.
// Two behaviours are folded together per input row:
//
// 1. Plain edits — `projectId` set → update; absent → insert. Cross-status
//    moves work by passing the new status; `position` is set to whatever
//    the editor chose for the target column.
// 2. Conversion from a `AdminProjectRequest` — on a create with `sourceRequestId`
//    set, validate the request is `emailVerified` and archive it in the same
//    transaction that inserts the project.
//
// On a create, `position` is optional — when absent, the row lands at the
// tail of the `planning` column. The tail is read once before the loop and
// incremented locally across new rows so a same-status batch lays out
// contiguously without a per-row max query. On an update, `position` is
// optional too: it is written only when supplied, so a plain rename/notes
// edit leaves the row's existing ordering untouched. The whole batch runs
// inside a single transaction so a partial failure rolls back to zero writes.
// `referenceIds` echoes the id per input row (in input order).
export async function adminProjectsUpsert(
    userId: string,
    inputs: readonly GqlSAdminProjectCreate[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — assign ids up front so the returned `referenceIds` echoes
    // input order (position defaults + source-request checks resolve in the
    // transaction).
    const seeds = inputs.map((input) => ({
        projectId: input.projectId ?? crypto.randomUUID(),
        input,
        isUpdate: Boolean(input.projectId),
    }));

    // Phase 2 — transactional execution.
    try {
        const updateIds = seeds.filter((seed) => seed.isUpdate).map((seed) => seed.projectId);

        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ projectId: projects.projectId })
                    .from(projects)
                    .where(inArray(projects.projectId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.projectId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminProjectsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }

            // Read the planning tail once — new rows without an explicit
            // position append to it, incrementing locally so a batch of
            // creates lays out contiguously.
            let planningTail: number | null = null;
            const planningTailNext = async (): Promise<number> => {
                if (planningTail === null) {
                    const [tail] = await transaction
                        .select({ position: projects.position })
                        .from(projects)
                        .where(eq(projects.status, 'planning'))
                        .orderBy(desc(projects.position))
                        .limit(1);
                    planningTail = tail?.position ?? -1;
                }
                planningTail += 1;
                return planningTail;
            };

            for (const { projectId, input, isUpdate } of seeds) {
                let sourceRequest = null;
                if (!isUpdate && input.sourceRequestId) {
                    const [row] = await transaction
                        .select()
                        .from(projectRequests)
                        .where(eq(projectRequests.projectRequestId, input.sourceRequestId));
                    if (!row) {
                        throw new Error(`adminProjectsUpsert: source request ${input.sourceRequestId} not found`);
                    }
                    if (row.status !== 'emailVerified') {
                        throw new Error(
                            `adminProjectsUpsert: source request ${input.sourceRequestId} is in state '${row.status}', expected 'emailVerified'`,
                        );
                    }
                    sourceRequest = row;
                }

                let position = input.position ?? null;
                if (!isUpdate && position === null) {
                    position = await planningTailNext();
                }

                if (isUpdate) {
                    // Only touch `position` when the caller supplied one — a plain
                    // rename/notes edit leaves the row's ordering untouched rather
                    // than forcing the editor to restate the board state.
                    const updatePayload: Partial<AdminProjectCreate> = {
                        title: input.title,
                        description: input.description ?? null,
                        notes: input.notes ?? null,
                        status: input.status,
                        startedAt: input.startedAt ?? null,
                        completedAt: input.completedAt ?? null,
                        updatedAt: now,
                    };
                    if (position !== null) {
                        updatePayload.position = position;
                    }
                    await transaction.update(projects).set(updatePayload).where(eq(projects.projectId, projectId));
                } else {
                    const payload: AdminProjectCreate = {
                        projectId,
                        title: input.title,
                        description: input.description ?? null,
                        notes: input.notes ?? null,
                        status: input.status,
                        position: position ?? 0,
                        sourceRequestId: input.sourceRequestId ?? null,
                        startedAt: input.startedAt ?? null,
                        completedAt: input.completedAt ?? null,
                        updatedAt: now,
                    };
                    await transaction.insert(projects).values(payload);
                }

                if (sourceRequest) {
                    await transaction
                        .update(projectRequests)
                        .set({ status: 'archived', updatedAt: now })
                        .where(eq(projectRequests.projectRequestId, sourceRequest.projectRequestId));
                }
            }
        });

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: seeds.map((seed) => seed.projectId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// The item schema is hand-built here rather than derived from
// `GqlSAdminProjectCreateSchema()`. The generated schema carries `z.date()` for
// the two timestamp scalars; under `structuredOutputs: true` the AI SDK
// converts the tool schema to JSON Schema for Gemini's constrained decoding,
// and `z.date()` has no clean JSON-Schema representation. The wire shape is
// always JSON, so every timestamp field declares `z.string()` here and the
// `execute` converts with `new Date(...)`. Only the GraphQL enum schema
// (`GqlSAdminProjectStatusSchema`) is reused so a future status addition surfaces
// as a TS error here rather than a runtime mismatch.

const projectItemSchema = z.object({
    projectId: z
        .uuid()
        .nullish()
        .describe(
            'Omit (or null) to create a new project. Pass an existing id to update; ids come from the prompt snapshot or projectsList.',
        ),
    title: z.string().min(1).max(200).describe('Single-line project title.'),
    description: z.string().max(2000).nullish().describe('Short summary shown on the card. Optional.'),
    notes: z.string().max(10000).nullish().describe('Long-form notes / markdown context. Optional.'),
    status: GqlSAdminProjectStatusSchema.describe('Board column. New projects typically land in `planning` or `idea`.'),
    position: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe(
            'Within-status ordering. Optional — omit to leave ordering unchanged on update, or to append to the planning column on create. Pass a value only when placing/reordering a card.',
        ),
    startedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp when work started. Optional; the editor stamps this manually rather than auto-derived.'),
    completedAt: z
        .string()
        .nullish()
        .describe('ISO-8601 timestamp when work completed. Optional; not auto-stamped by `status: done` — leave that to a follow-up edit.'),
    sourceRequestId: z
        .uuid()
        .nullish()
        .describe(
            'Optional: id of a verified `AdminProjectRequest` to convert into this project. Leave null unless the user is explicitly converting an inbox request.',
        ),
});

const toolProjectsUpsertInputSchema = z.object({
    projects: z
        .array(projectItemSchema)
        .min(1)
        .describe('One or more projects to create or update. Pass a one-element array for a single edit.'),
});

interface ProjectsAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolProjectsUpsert({ serverRuntime, session }: ProjectsAgentToolContext) {
    return tool({
        description: [
            'Batch create or update workspace projects.',
            'For a new project: omit `projectId` — the server allocates one. For an edit: pass the id from the',
            'system-prompt snapshot or a prior `projectsList` call. `position` is optional: omit it to leave a',
            "card's ordering untouched on edit (or to append to the planning column on create); pass it only when",
            'placing or reordering a card. Status `done` does not auto-stamp `completedAt`.',
            'Batch same-shape writes into one call; every row with a `projectId` is updated, every row without one',
            'is inserted. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolProjectsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminProjectCreate[] = input.projects.map((project) => ({
                projectId: project.projectId ?? null,
                title: project.title,
                description: project.description ?? null,
                notes: project.notes ?? null,
                status: project.status,
                position: project.position ?? null,
                sourceRequestId: project.sourceRequestId ?? null,
                startedAt: project.startedAt ? new Date(project.startedAt) : null,
                completedAt: project.completedAt ? new Date(project.completedAt) : null,
            }));
            return adminProjectsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
