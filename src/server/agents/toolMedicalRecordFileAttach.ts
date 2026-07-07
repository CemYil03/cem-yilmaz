import { tool } from 'ai';
import { z } from 'zod';
import { medicalRecordFileAttach } from '../commands/medicalRecordFileAttach';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import type { MedicalAgentMutationLog } from './agentPersonalAssistantMedical';
import { requireAdminUserId } from './requireAdminUserId';

const medicalRecordFileAttachInputSchema = z.object({
    recordId: z.uuid().describe('Record to attach the file to.'),
    fileUploadId: z.uuid().describe('Existing FileUpload row id — the user must own it.'),
    label: z.string().max(200).nullish().describe('Optional label for the file, e.g. "rash photo, day 3".'),
    pinned: z.boolean().nullish().describe('Whether to pin the file at the top of the record. Default false.'),
});

interface MedicalAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: MedicalAgentMutationLog;
}

export function toolMedicalRecordFileAttach({ serverRuntime, session, mutations }: MedicalAgentMutationContext) {
    return tool({
        description: [
            'Attach an already-uploaded file to an existing medical record. Prefer bundling `fileUploadIds` on',
            '`medicalRecordUpsert` for the initial write; use this tool only when adding a file to a record that',
            'already exists.',
        ].join(' '),
        inputSchema: medicalRecordFileAttachInputSchema,
        execute: async (input) => {
            const result = await medicalRecordFileAttach(
                requireAdminUserId(session),
                {
                    input: {
                        recordId: input.recordId,
                        fileUploadId: input.fileUploadId,
                        label: input.label ?? null,
                        pinned: input.pinned ?? null,
                    },
                },
                session,
                serverRuntime,
            );
            mutations.push({ kind: 'fileAttach', id: result.recordFileId, title: input.label ?? undefined });
            return result;
        },
    });
}
