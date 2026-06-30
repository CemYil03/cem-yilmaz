import { eq } from 'drizzle-orm';
import { adminChatConfig } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_CONFIG_SINGLETON_ID } from '../agents/adminChatConfig';
import { isAdminChatModelId } from '../agents/adminChatModels';
import { adminChatConfigGet } from '../queries/adminChatConfigGet';

// Persists the admin's chosen default chat model. Rejects unknown ids — the
// catalog (`adminChatModels.ts`) is the only valid set; smuggling an unknown
// id past this would surface as an upstream Gemini error on the next chat
// turn, which we'd rather catch here at write time.
//
// Upserts via the singleton row pattern: ensures the row exists (lazy
// bootstrap), then updates `defaultModelId` and `updatedAt`. Idempotent on
// "set to the same value" — same row, fresh `updatedAt`.
export async function adminChatConfigDefaultModelSet(
    userId: string,
    args: { modelId: string },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    if (!isAdminChatModelId(args.modelId)) {
        throw new Error(`Unknown chat model id: ${args.modelId}`);
    }
    try {
        // Ensures the singleton row exists before we update — keeps the
        // bootstrap and the update on the same code path.
        await adminChatConfigGet(serverRuntime.db);
        const [updated] = await serverRuntime.db
            .update(adminChatConfig)
            .set({ defaultModelId: args.modelId, updatedAt: new Date() })
            .where(eq(adminChatConfig.adminChatConfigId, ADMIN_CHAT_CONFIG_SINGLETON_ID))
            .returning({ adminChatConfigId: adminChatConfig.adminChatConfigId });
        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: updated?.adminChatConfigId ?? null };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
