import { tool } from 'ai';
import { z } from 'zod';
import { adminMedicalRecordFilesAttach } from '../commands/adminMedicalRecordFilesAttach';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSAdminMedicalRecordFileAttachInputSchema } from '../graphql/generated';
import type { GqlSAdminMedicalRecordFileAttachInput, GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

// Batch attach of already-uploaded files to existing medical records. The
// item schema is the generated `GqlSAdminMedicalRecordFileAttachInputSchema()`.
// Gemini-safe: no `DateTime` fields.

const toolMedicalRecordFilesAttachInputSchema = z.object({
    inputs: z
        .array(GqlSAdminMedicalRecordFileAttachInputSchema())
        .min(1)
        .describe('One or more file attachments. Pass a one-element array for a single attach.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordFilesAttach({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Attach one or more already-uploaded files to existing medical records.',
            'Prefer bundling `fileUploadIds` on `medicalRecordsUpsert` for the initial write; use this tool only',
            'when adding files to records that already exist. `label` is optional (e.g. "rash photo, day 3");',
            '`pinned` defaults to false. Returns `referenceIds` in input order.',
        ].join(' '),
        inputSchema: toolMedicalRecordFilesAttachInputSchema,
        execute: async (rawInput) => {
            const inputs = rawInput.inputs as GqlSAdminMedicalRecordFileAttachInput[];
            const result = await adminMedicalRecordFilesAttach(requireAdminUserId(session), inputs, session, serverRuntime);
            const referenceIds = result.referenceIds ?? [];
            inputs.forEach((input, index) => {
                mutations.push({ kind: 'fileAttach', id: referenceIds[index] ?? '', title: input.label ?? undefined });
            });
            return result;
        },
    });
}
