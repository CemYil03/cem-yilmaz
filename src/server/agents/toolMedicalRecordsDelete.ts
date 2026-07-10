import { tool } from 'ai';
import { z } from 'zod';
import { adminMedicalRecordsDelete } from '../commands/adminMedicalRecordsDelete';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

const toolMedicalRecordsDeleteInputSchema = z.object({
    recordIds: z.array(z.uuid()).min(1).describe('Record row ids to delete. Attached file join rows are removed with each record.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordsDelete({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description:
            'Permanently delete one or more medical records. Attached files are removed along with each record row. There is no soft-delete — only use when the user really wants them gone.',
        inputSchema: toolMedicalRecordsDeleteInputSchema,
        execute: async (input) => {
            const result = await adminMedicalRecordsDelete(requireAdminUserId(session), input.recordIds, session, serverRuntime);
            for (const recordId of input.recordIds) mutations.push({ kind: 'recordDelete', id: recordId });
            return result;
        },
    });
}
