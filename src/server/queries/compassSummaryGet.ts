import { eq } from 'drizzle-orm';
import { compass } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { COMPASS_SINGLETON_ID } from '../agents/compassConfig';

// FIREWALL ANCHOR.
//
// This is the ONLY read path that exposes compass data back into an agent's
// system prompt. The `agentPersonalAssistant` factory calls this, prepends
// the returned text to its instructions, and that's it. `prose` and
// `psychology` MUST NOT be added to this query — they exist for Cem's
// reading only. See `docs/features/compass.md` ("Firewall").
//
// Returns `''` (not null) when no compass exists yet; the agent treats an
// empty summary as "no context to inject" and produces a clean instruction
// block.
export async function compassSummaryGet(serverRuntime: ServerRuntime): Promise<string> {
    try {
        const [row] = await serverRuntime.db
            .select({ summary: compass.summary })
            .from(compass)
            .where(eq(compass.compassId, COMPASS_SINGLETON_ID))
            .limit(1);
        return row?.summary ?? '';
    } catch (error) {
        // A failed summary read must NEVER break the chat turn. Log and
        // degrade to the no-context branch — the assistant still answers,
        // just without the injected facts.
        serverRuntime.log.error(error, null);
        return '';
    }
}
