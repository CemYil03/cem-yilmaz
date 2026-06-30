import { generateText, Output } from 'ai';
import { asc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { compass, compassObservations, users } from '../../db/schema';
import type { QueuedJobDefinition } from '../types';
import { compassGet } from '../../queries/compassGet';
import { COMPASS_SINGLETON_ID } from '../../agents/compassConfig';

// Reads every non-dismissed observation plus the prior compass and rewrites
// the three text artifacts in one transaction. Resets
// `observationsSinceSynthesis` to 0 so the threshold trigger restarts.
//
// `reason` is informational only — used for logging so the audit trail in
// `Logs` shows whether a run came from the analyzer's threshold or from a
// human "Re-synthesize now" click.
//
// See `docs/features/compass.md` ("Synthesizer").

interface CompassSynthesizeData {
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
            'Long-form portrait (markdown, multiple paragraphs). Reads like a careful friend describing Cem to someone new. Includes his work, interests, working style, and what motivates him.',
        ),
    psychology: z
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
    '3. psychology — psychological synthesis. Markdown. Recurring themes, emotional patterns, stress markers, what energizes him, what drains him. Written in English. This is NEVER shown back to the assistant — only to Cem.',
    '',
    'Rules:',
    '- All output in English.',
    "- Ground every claim in the observations. Do NOT invent biography. If observations are thin, the resulting compass should be thin too — don't pad.",
    '- Prefer specifics over abstractions ("ships solo on side-projects late at night" beats "is hardworking").',
    '- When a prior compass exists, treat it as a draft you are refining, not a contract.',
    '- Stay honest in psychology. The point of the firewall is to enable real candor.',
].join('\n');

export const compassSynthesize: QueuedJobDefinition<CompassSynthesizeData> = {
    kind: 'queued',
    name: 'compass-synthesize',
    handler: async ({ data, serverRuntime }) => {
        try {
            serverRuntime.log.info(`compassSynthesize: starting (reason=${data.reason})`);
            const previous = await compassGet(serverRuntime.db);

            const observations = await serverRuntime.db
                .select({
                    category: compassObservations.category,
                    content: compassObservations.content,
                    createdAt: compassObservations.createdAt,
                })
                .from(compassObservations)
                .where(isNull(compassObservations.dismissedAt))
                .orderBy(asc(compassObservations.createdAt));

            if (observations.length === 0) {
                serverRuntime.log.info('compassSynthesize: no observations yet, skipping');
                return;
            }

            const observationsBlock = observations.map((o) => `- [${o.category}] ${o.content}`).join('\n');
            const priorBlock =
                previous.summary || previous.prose || previous.psychology
                    ? [
                          'Prior compass (refine, do not start from scratch unless contradicted):',
                          '--- summary ---',
                          previous.summary || '(empty)',
                          '--- prose ---',
                          previous.prose || '(empty)',
                          '--- psychology ---',
                          previous.psychology || '(empty)',
                      ].join('\n')
                    : '(no prior compass yet — this is the first synthesis)';

            const userPrompt = [
                priorBlock,
                '',
                `Observations (${observations.length} total, oldest first):`,
                observationsBlock,
                '',
                'Produce the three artifacts.',
            ].join('\n');

            const model = serverRuntime.ai.compassSynthesizerModel();
            const result = await generateText({
                model,
                output: Output.object({ schema: SYNTHESIS_SCHEMA }),
                system: SYNTHESIS_SYSTEM_PROMPT,
                prompt: userPrompt,
            });

            const now = new Date();
            await serverRuntime.db
                .update(compass)
                .set({
                    summary: result.output.summary,
                    prose: result.output.prose,
                    psychology: result.output.psychology,
                    synthesizedAt: now,
                    synthesisModelId: result.response.modelId,
                    observationsSinceSynthesis: 0,
                    updatedAt: now,
                })
                .where(eq(compass.compassId, COMPASS_SINGLETON_ID));

            serverRuntime.log.info(`compassSynthesize: synthesized from ${observations.length} observations`);

            // Notify every admin's `/workspace/compass` subscription that the
            // three artifacts changed. The seed-and-subscribe pattern in
            // `docs/architecture/state-synchronization.md` relies on this —
            // without it the page would have to poll waiting for the job to
            // finish. Cheap one-row select; compass is single-admin in
            // practice but the query stays correct if that changes.
            const admins = await serverRuntime.db.select({ userId: users.userId }).from(users).where(eq(users.isAdmin, true));
            await Promise.all(admins.map(({ userId }) => serverRuntime.publish.userUpdates({ userId })));
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
