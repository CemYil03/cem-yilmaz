import { tool } from 'ai';
import { medicalRecordFileAttach } from '../commands/medicalRecordFileAttach';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSMedicalRecordFileAttachInputSchema } from '../graphql/generated';
import type { GqlSMedicalRecordFileAttachInput, GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

// Attach an already-uploaded file to an existing medical record. The input
// schema is the generated `GqlSMedicalRecordFileAttachInputSchema()`.
// Gemini-safe: no `DateTime` fields.

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordFileAttach({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Attach an already-uploaded file to an existing medical record.',
            'Prefer bundling `fileUploadIds` on `medicalRecordUpsert` for the initial write; use this tool only',
            'when adding a file to a record that already exists. `label` is optional (e.g. "rash photo, day 3");',
            '`pinned` defaults to false.',
        ].join(' '),
        inputSchema: GqlSMedicalRecordFileAttachInputSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSMedicalRecordFileAttachInput;
            const result = await medicalRecordFileAttach(requireAdminUserId(session), { input }, session, serverRuntime);
            mutations.push({ kind: 'fileAttach', id: result.recordFileId, title: input.label ?? undefined });
            return result;
        },
    });
}
