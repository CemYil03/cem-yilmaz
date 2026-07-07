import { tool } from 'ai';
import { z } from 'zod';
import { medicalRecordDelete } from '../commands/medicalRecordDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

const medicalRecordDeleteInputSchema = z.object({
    recordId: z.uuid().describe('Record row id to delete.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordDelete({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description:
            'Permanently delete a medical record. Attached files are removed along with the record row. There is no soft-delete — only use when the user really wants it gone.',
        inputSchema: medicalRecordDeleteInputSchema,
        execute: async (input) => {
            const result = await medicalRecordDelete(requireAdminUserId(session), { recordId: input.recordId }, session, serverRuntime);
            mutations.push({ kind: 'recordDelete', id: input.recordId });
            return result;
        },
    });
}
