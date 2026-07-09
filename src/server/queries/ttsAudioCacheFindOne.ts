import { eq, sql } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { ttsAudioCache } from '../db/schema';
import type { TtsAudioCacheRow } from '../db/schema';

// By-hash load of a cached TTS clip. Bumps `lastAccessedAt` as a side effect
// so a future eviction job can drop rows nobody has listened to in a while.
// Returns `null` on miss — the caller synthesizes and writes via
// `ttsAudioCacheUpsert`.
export async function ttsAudioCacheFindOne(
    dbOrTransaction: Database | DatabaseTransaction,
    contentHash: string,
): Promise<TtsAudioCacheRow | null> {
    const rows = await dbOrTransaction.select().from(ttsAudioCache).where(eq(ttsAudioCache.contentHash, contentHash)).limit(1);
    const row = rows[0];
    if (!row) return null;
    // Fire-and-forget access-time bump — the response body is what the caller
    // waits on. If this update fails, the cache still worked; we log nothing
    // here so a repeated failure doesn't spam.
    void dbOrTransaction
        .update(ttsAudioCache)
        .set({ lastAccessedAt: sql`NOW()` })
        .where(eq(ttsAudioCache.contentHash, contentHash));
    return row;
}
