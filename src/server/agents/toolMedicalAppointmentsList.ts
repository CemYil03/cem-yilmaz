import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminMedicalAppointmentFindMany } from '../queries/adminMedicalAppointmentFindMany';

interface MedicalAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const medicalAppointmentsListInputSchema = z.object({
    category: z
        .enum(['dentist', 'gp', 'dermatology', 'eyes', 'mentalHealth', 'ent', 'physio', 'other'])
        .optional()
        .describe('Narrow to a single category. Omit to list every category.'),
});

export function toolMedicalAppointmentsList({ serverRuntime, session }: MedicalAgentReadContext) {
    return tool({
        description: [
            'List medical appointments with full metadata.',
            'Use only when the system-prompt snapshot is not enough — typically when Cem asks about notes or',
            'provider details of a specific visit. For "when is my next dentist visit?" the snapshot already answers.',
        ].join(' '),
        inputSchema: medicalAppointmentsListInputSchema,
        execute: async (input) => {
            const rows = await adminMedicalAppointmentFindMany(session, serverRuntime);
            return input.category ? rows.filter((r) => r.category === input.category) : rows;
        },
    });
}
