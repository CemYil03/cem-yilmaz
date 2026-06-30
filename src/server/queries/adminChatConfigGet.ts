import { eq } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { adminChatConfig } from '../db/schema';
import type { AdminChatConfig, AdminChatConfigCreate } from '../db/schema';
import { ADMIN_CHAT_CONFIG_SINGLETON_ID } from '../agents/adminChatConfig';
import { ADMIN_CHAT_MODEL_FALLBACK_ID, isAdminChatModelId } from '../agents/adminChatModels';

// Loads the singleton `AdminChatConfig` row, creating it lazily if it does not
// exist yet. Mirrors `compassGet` (`compassGet.ts`) — callers can rely on this
// returning a row and never need to handle the "no config yet" case.
//
// If the row's `defaultModelId` is no longer in the catalog (a model id was
// removed in a deploy), we transparently swap it for the catalog fallback
// rather than persist a fix-up here. The mutation path (`chatConfigDefaultModelSet`)
// is the only writer; this is a read.
export async function adminChatConfigGet(dbOrTx: Database | DatabaseTransaction): Promise<AdminChatConfig> {
    const [existing] = await dbOrTx
        .select()
        .from(adminChatConfig)
        .where(eq(adminChatConfig.adminChatConfigId, ADMIN_CHAT_CONFIG_SINGLETON_ID))
        .limit(1);
    if (existing) {
        if (isAdminChatModelId(existing.defaultModelId)) return existing;
        return { ...existing, defaultModelId: ADMIN_CHAT_MODEL_FALLBACK_ID };
    }

    const seed: AdminChatConfigCreate = {
        adminChatConfigId: ADMIN_CHAT_CONFIG_SINGLETON_ID,
        defaultModelId: ADMIN_CHAT_MODEL_FALLBACK_ID,
    };
    const [inserted] = await dbOrTx.insert(adminChatConfig).values(seed).onConflictDoNothing().returning();
    // `onConflictDoNothing` returns `[]` if a parallel call inserted between
    // our SELECT and INSERT — re-read in that case so we still return a row.
    if (inserted) return inserted;
    const [raced] = await dbOrTx
        .select()
        .from(adminChatConfig)
        .where(eq(adminChatConfig.adminChatConfigId, ADMIN_CHAT_CONFIG_SINGLETON_ID))
        .limit(1);
    if (!raced) {
        throw new Error('adminChatConfigGet: failed to load or seed the singleton admin chat config row');
    }
    return raced;
}
