import { sql } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db';
import { ttsAudioCache } from '../db/schema';
import type { TtsAudioCacheCreate, TtsAudioCacheRow } from '../db/schema';

// Upsert a synthesized TTS clip. Called on cache-miss after Gemini returns
// the final bytes for a given `(text, voice, model, format)` tuple.
//
// Conflict path: two requests can race the same key (same message, two
// tabs). Both compute the same `contentHash`; both call this. The winner
// inserts, the loser hits `ON CONFLICT` and refreshes `lastAccessedAt`
// against the winner's row — nobody duplicates the bytes.
export async function ttsAudioCacheUpsert(
    dbOrTransaction: Database | DatabaseTransaction,
    input: TtsAudioCacheCreate,
): Promise<TtsAudioCacheRow> {
    const [row] = await dbOrTransaction
        .insert(ttsAudioCache)
        .values(input)
        .onConflictDoUpdate({
            target: ttsAudioCache.contentHash,
            set: { lastAccessedAt: sql`NOW()` },
        })
        .returning();
    if (!row) throw new Error('ttsAudioCacheUpsert: insert returned no rows');
    return row;
}
