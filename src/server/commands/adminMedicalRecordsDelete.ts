import { tool } from 'ai';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdminUserId } from '../agents/requireAdminUserId';
import { medicalRecords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

// Batch delete of records. The FK cascade on `MedicalRecordFiles` removes
// join rows; the underlying `FileUploads` bytes stay put (cleaned by the
// user cascade if the user is ever removed). A caller-supplied id that never
// existed makes the batch throw.
export async function adminMedicalRecordsDelete(
    userId: string,
    recordIds: readonly string[],
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const deleted = await serverRuntime.db
            .delete(medicalRecords)
            .where(inArray(medicalRecords.recordId, recordIds as string[]))
            .returning({ recordId: medicalRecords.recordId });
        if (deleted.length !== recordIds.length) {
            const found = new Set(deleted.map((row) => row.recordId));
            const missing = recordIds.filter((id) => !found.has(id));
            throw new Error(`adminMedicalRecordsDelete: rows not found: ${missing.join(', ')}`);
        }
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: null, referenceIds: [...recordIds] };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}

const toolMedicalRecordsDeleteInputSchema = z.object({
    recordIds: z.array(z.uuid()).min(1).describe('Record row ids to delete. Attached file join rows are removed with each record.'),
});

interface MedicalAgentToolContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
}

export function toolMedicalRecordsDelete({ serverRuntime, session }: MedicalAgentToolContext) {
    return tool({
        description:
            'Permanently delete one or more medical records. Attached files are removed along with each record row. There is no soft-delete — only use when the user really wants them gone.',
        inputSchema: toolMedicalRecordsDeleteInputSchema,
        execute: async (input) => {
            return adminMedicalRecordsDelete(requireAdminUserId(session), input.recordIds, session, serverRuntime);
        },
    });
}
