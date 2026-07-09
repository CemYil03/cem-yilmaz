import { tool } from 'ai';
import { z } from 'zod';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { adminMedicalRecordFindMany } from '../queries/adminMedicalRecordFindMany';

interface MedicalAgentReadContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

const medicalRecordsListInputSchema = z.object({
    category: z
        .enum(['dentist', 'gp', 'dermatology', 'eyes', 'mentalHealth', 'ent', 'physio', 'other'])
        .optional()
        .describe('Narrow to a single category. Omit to list every category.'),
});

export function toolMedicalRecordsList({ serverRuntime, session }: MedicalAgentReadContext) {
    return tool({
        description: [
            'List medical records with full summaries and attached files.',
            'Use when the snapshot summary is not enough — e.g. when Cem asks about the details of a specific',
            'past record, or wants to check whether attachments are on file.',
        ].join(' '),
        inputSchema: medicalRecordsListInputSchema,
        execute: async (input) => {
            const rows = await adminMedicalRecordFindMany(session, serverRuntime);
            return input.category ? rows.filter((r) => r.category === input.category) : rows;
        },
    });
}
