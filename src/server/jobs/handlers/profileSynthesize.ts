import { generateObject } from 'ai';
import { asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { profile, profileObservations } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';
import { profileGet } from '../../queries/profileGet';
import { PROFILE_SINGLETON_ID } from '../../agents/profileConfig';

// Reads every non-dismissed observation plus the prior profile and rewrites
// the three text artifacts in one transaction. Resets
// `observationsSinceSynthesis` to 0 so the threshold trigger restarts.
//
// `reason` is informational only — used for logging so the audit trail in
// `Logs` shows whether a run came from the analyzer's threshold or from a
// human "Re-synthesize now" click.
//
// See `docs/features/profile.md` ("Synthesizer").

interface ProfileSynthesizeData {
    reason: 'threshold' | 'manual' | 'cron';
}

const SYNTHESIS_SCHEMA = z.object({
    summary: z
        .string()
        .describe(
            'Short factual summary (≤ 500 tokens). Concrete facts only — what Cem works on, his tools, preferences, current focus. Written as third-person bullets. This is INJECTED into the assistant prompt — keep it tight.',
        ),
    prose: z
        .string()
        .describe(
            'Long-form profile (markdown, multiple paragraphs). Reads like a careful friend describing Cem to someone new. Includes his work, interests, working style, and what motivates him.',
        ),
    psychProfile: z
        .string()
        .describe(
            'Psychological synthesis (markdown). Recurring themes, emotional patterns, stress markers, what energizes vs. drains him. Honest, useful, NEVER shown to the assistant — only to Cem himself.',
        ),
});

const SYNTHESIS_SYSTEM_PROMPT = [
    'You are a careful profiler synthesizing a portrait of Cem Yilmaz, owner of cem-yilmaz.de, from a list of observations recorded over time.',
    '',
    'Produce three artifacts:',
    '1. summary — short, factual, will be injected into Cem\'s own AI assistant\'s system prompt so it can answer "who am I working with" without being asked. Third-person bullets. ≤ 500 tokens.',
    '2. prose — long-form description. Markdown. Multiple paragraphs. Cohesive narrative of who Cem is, how he works, what he cares about.',
    '3. psychProfile — psychological synthesis. Markdown. Recurring themes, emotional patterns, stress markers, what energizes him, what drains him. Written in English. This is NEVER shown back to the assistant — only to Cem.',
    '',
    'Rules:',
    '- All output in English.',
    "- Ground every claim in the observations. Do NOT invent biography. If observations are thin, the resulting profile should be thin too — don't pad.",
    '- Prefer specifics over abstractions ("ships solo on side-projects late at night" beats "is hardworking").',
    '- When prior profile text exists, treat it as a draft you are refining, not a contract.',
    '- Stay honest in psychProfile. The point of the firewall is to enable real candor.',
].join('\n');

export const profileSynthesize: QueuedJobDefinition<ProfileSynthesizeData> = {
    kind: 'queued',
    name: 'profile-synthesize',
    handler: async ({ data, serverRuntime }) => {
        try {
            serverRuntime.log.info(`profileSynthesize: starting (reason=${data.reason})`);
            const previous = await profileGet(serverRuntime.db);

            const observations = await serverRuntime.db
                .select({
                    category: profileObservations.category,
                    content: profileObservations.content,
                    createdAt: profileObservations.createdAt,
                })
                .from(profileObservations)
                .where(isNull(profileObservations.dismissedAt))
                .orderBy(asc(profileObservations.createdAt));

            if (observations.length === 0) {
                serverRuntime.log.info('profileSynthesize: no observations yet, skipping');
                return;
            }

            const observationsBlock = observations.map((o) => `- [${o.category}] ${o.content}`).join('\n');
            const priorBlock =
                previous.summary || previous.prose || previous.psychProfile
                    ? [
                          'Prior profile (refine, do not start from scratch unless contradicted):',
                          '--- summary ---',
                          previous.summary || '(empty)',
                          '--- prose ---',
                          previous.prose || '(empty)',
                          '--- psychProfile ---',
                          previous.psychProfile || '(empty)',
                      ].join('\n')
                    : '(no prior profile yet — this is the first synthesis)';

            const userPrompt = [
                priorBlock,
                '',
                `Observations (${observations.length} total, oldest first):`,
                observationsBlock,
                '',
                'Produce the three artifacts.',
            ].join('\n');

            const model = serverRuntime.ai.profileSynthesizerModel();
            const result = await generateObject({
                model,
                schema: SYNTHESIS_SCHEMA,
                instructions: SYNTHESIS_SYSTEM_PROMPT,
                prompt: userPrompt,
            });

            const now = new Date();
            await serverRuntime.db
                .update(profile)
                .set({
                    summary: result.object.summary,
                    prose: result.object.prose,
                    psychProfile: result.object.psychProfile,
                    synthesizedAt: now,
                    synthesisModelId: result.response.modelId,
                    observationsSinceSynthesis: 0,
                    updatedAt: now,
                })
                .where(eq(profile.profileId, PROFILE_SINGLETON_ID));

            serverRuntime.log.info(`profileSynthesize: synthesized from ${observations.length} observations`);
        } catch (error) {
            serverRuntime.log.error(error, null);
            throw error;
        }
    },
    options: {
        retryLimit: 1,
        retryDelay: 120,
        expireInSeconds: 300,
    },
};
