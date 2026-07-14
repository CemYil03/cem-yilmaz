import { tool } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { medicalAppointments } from '../db/schema';
import type { AdminMedicalAppointmentCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMedicalAppointmentStatusSchema, GqlSAdminMedicalCategorySchema } from '../graphql/generated';
import type { GqlSAdminMedicalAppointmentInput, GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch upsert of medical appointments. Every input with an `appointmentId`
// is updated; every input without one is inserted under a freshly-minted
// UUID. The whole batch runs inside a single transaction so a partial
// failure rolls back to zero writes. `referenceIds` echoes the id per input
// row (in input order) so the caller can address newly-created rows without
// a follow-up read.
//
// Completing an appointment is a one-element upsert with `status: completed`
// and `completedAt` set — the caller spreads the existing row (from the
// subscription payload) and overrides those fields. There is no separate
// "complete" path.
export async function adminMedicalAppointmentsUpsert(
    userId: string,
    inputs: readonly GqlSAdminMedicalAppointmentInput[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const now = new Date();

    // Phase 1 — payload construction.
    const rows = inputs.map((input) => {
        const appointmentId = input.appointmentId ?? crypto.randomUUID();
        const payload: AdminMedicalAppointmentCreate = {
            appointmentId,
            category: input.category,
            providerName: input.providerName ?? null,
            title: input.title,
            notes: input.notes ?? null,
            scheduledAt: input.scheduledAt,
            completedAt: input.completedAt ?? null,
            nextDueAt: input.nextDueAt ?? null,
            status: input.status,
            topics: input.topics,
            updatedAt: now,
        };
        return { appointmentId, isUpdate: Boolean(input.appointmentId), payload };
    });

    // Phase 2 — transactional execution.
    try {
        const updateIds = rows.filter((row) => row.isUpdate).map((row) => row.appointmentId);
        await serverRuntime.db.transaction(async (transaction) => {
            if (updateIds.length > 0) {
                const existing = await transaction
                    .select({ appointmentId: medicalAppointments.appointmentId })
                    .from(medicalAppointments)
                    .where(inArray(medicalAppointments.appointmentId, updateIds));
                if (existing.length !== updateIds.length) {
                    const found = new Set(existing.map((row) => row.appointmentId));
                    const missing = updateIds.filter((id) => !found.has(id));
                    throw new Error(`adminMedicalAppointmentsUpsert: rows not found: ${missing.join(', ')}`);
                }
            }
            for (const row of rows) {
                if (row.isUpdate) {
                    await transaction
                        .update(medicalAppointments)
                        .set(row.payload)
                        .where(eq(medicalAppointments.appointmentId, row.appointmentId));
                } else {
                    await transaction.insert(medicalAppointments).values(row.payload);
                }
            }
        });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: rows.map((row) => row.appointmentId) };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

// Batch create-or-edit of medical appointments. Hand-built item schema —
// same rationale as `toolMoviesUpsert.ts`: Gemini's structured output rejects
// `z.date()`, so the DateTime fields ride the wire as ISO strings and the
// `execute` converts with `new Date(...)`. Only the GraphQL enum schemas are
// reused so a future enum addition surfaces as a TS error here.

const medicalAppointmentItemSchema = z.object({
    appointmentId: z.uuid().nullish().describe('Omit (or null) to create a new appointment. Pass an existing id to edit.'),
    category: GqlSAdminMedicalCategorySchema.describe('dentist | gp | dermatology | eyes | mentalHealth | ent | physio | other'),
    providerName: z.string().max(200).nullish().describe('e.g. "Dr Schmidt" or "Zahnarztpraxis Am Markt". Optional.'),
    title: z.string().min(1).max(200).describe('Short label for the visit, e.g. "routine check-up".'),
    notes: z.string().max(4000).nullish(),
    scheduledAt: z.string().describe('ISO-8601 timestamp of the intended visit time.'),
    completedAt: z.string().nullish().describe('ISO-8601 stamp when the visit actually happened. Set only when status is completed.'),
    nextDueAt: z.string().nullish().describe('ISO-8601 stamp for the next expected visit. Overrides the category cadence when present.'),
    status: GqlSAdminMedicalAppointmentStatusSchema.describe('scheduled | completed | cancelled | missed'),
    topics: z.array(z.string()).describe('Free-form cluster tags. Empty array if none.'),
});

const toolMedicalAppointmentsUpsertInputSchema = z.object({
    medicalAppointments: z
        .array(medicalAppointmentItemSchema)
        .min(1)
        .describe('One or more appointments to create or edit. Pass a one-element array for a single edit.'),
});

interface MedicalAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMedicalAppointmentsUpsert({ serverRuntime, session }: MedicalAgentToolContext) {
    return tool({
        description: [
            'Batch create-or-edit of medical appointments (scheduled or completed visits with a provider). Every row',
            'with an `appointmentId` is updated; every row without one is inserted. To COMPLETE a visit, pass a',
            'one-element array carrying the existing appointment plus `status: completed` and `completedAt` set',
            '(may be earlier than now). Batch same-shape writes into one call. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolMedicalAppointmentsUpsertInputSchema,
        execute: async (input) => {
            const inputs: GqlSAdminMedicalAppointmentInput[] = input.medicalAppointments.map((appointment) => ({
                appointmentId: appointment.appointmentId ?? null,
                category: appointment.category,
                providerName: appointment.providerName ?? null,
                title: appointment.title,
                notes: appointment.notes ?? null,
                scheduledAt: new Date(appointment.scheduledAt),
                completedAt: appointment.completedAt ? new Date(appointment.completedAt) : null,
                nextDueAt: appointment.nextDueAt ? new Date(appointment.nextDueAt) : null,
                status: appointment.status,
                topics: appointment.topics,
            }));
            return adminMedicalAppointmentsUpsert(requireAdminUserId(session), inputs, session, serverRuntime);
        },
    });
}
