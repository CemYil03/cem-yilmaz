import { eq } from 'drizzle-orm';
import { profile } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { PROFILE_SINGLETON_ID } from '../agents/profileConfig';

// FIREWALL ANCHOR.
//
// This is the ONLY read path that exposes profile data back into an agent's
// system prompt. The `agentPersonalAssistant` factory calls this, prepends
// the returned text to its instructions, and that's it. `prose` and
// `psychProfile` MUST NOT be added to this query — they exist for Cem's
// reading only. See `docs/features/profile.md` ("Firewall").
//
// Returns `''` (not null) when no profile exists yet; the agent treats an
// empty summary as "no context to inject" and produces a clean instruction
// block.
export async function profileSummaryGet(serverRuntime: ServerRuntime): Promise<string> {
    try {
        const [row] = await serverRuntime.db
            .select({ summary: profile.summary })
            .from(profile)
            .where(eq(profile.profileId, PROFILE_SINGLETON_ID))
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
