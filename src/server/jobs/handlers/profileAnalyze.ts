import { generateObject } from 'ai';
import { and, asc, eq, lt } from 'drizzle-orm';
import { z } from 'zod';
import { profileObservationCreate } from '../../commands/profileObservationCreate';
import { chatMessages, chatMessagesUser, profileMessageAnalysis, profileObservationCategories } from '../../db/schema';
import type { ProfileMessageAnalysisCreate } from '../../db/schema';
import { PROFILE_SYNTHESIS_THRESHOLD } from '../../agents/profileConfig';
import { profileGet } from '../../queries/profileGet';
import type { QueuedJobDefinition } from '../types';
import { profileSynthesize } from './profileSynthesize';

// One enqueue per admin user message. The handler:
//   1. Bails if the message has already been analyzed (idempotent re-runs).
//   2. Loads the message and a small rolling context (the last 6 turns).
//   3. Asks the analyzer LLM to extract zero-or-more observations — explicit
//      "return nothing if nothing is new" instruction in the prompt to fight
//      the model's bias toward producing output.
//   4. Persists each observation; records the per-message analysis row.
//   5. Auto-enqueues `profileSynthesize` if the counter crossed the threshold.
//
// Errors are logged and swallowed: a failed analyzer pass must NEVER block the
// chat path. The chat surface already returned to the user by the time this
// runs.
//
// See `docs/features/profile.md`.

interface ProfileAnalyzeData {
    chatMessageId: string;
}

const OBSERVATION_SCHEMA = z.object({
    observations: z
        .array(
            z.object({
                // Tight free-text categorization keeps the LLM honest. The
                // enum is identical to the DB / GraphQL one.
                category: z.enum(profileObservationCategories),
                content: z.string().describe('One concrete observation. Specific phrasing — quote when psychological.'),
                confidencePercent: z.number().int().min(0).max(100).optional().describe('How confident you are, 0–100.'),
            }),
        )
        .describe('Zero or more observations. RETURN AN EMPTY ARRAY when the message reveals nothing new.'),
});

const SYSTEM_PROMPT = [
    'You are a careful profiler reading one new message from Cem (the owner of cem-yilmaz.de) to his own personal assistant.',
    '',
    'Your job: extract concrete observations ONLY when the message reveals something new about Cem.',
    '',
    'Categories:',
    '- factual: concrete facts (skills, preferences, life events, plans, tools, opinions on tech).',
    '- behavioral: communication style, decision patterns, how he asks for things, working habits.',
    '- psychological: state of mind, stress markers, emotional themes, recurring concerns. Quote phrasing.',
    '',
    'Rules:',
    '- Be specific. "Likes minimal UI" beats "has preferences".',
    '- If the message is small talk, a one-off task, or contains no signal, return [].',
    '- Do NOT invent. If unsure whether a thing is new or revealing, omit it.',
    '- Each observation is one self-contained sentence. No lists, no markdown.',
    '- Quote his own words when categorizing as psychological so synthesis can preserve voice.',
].join('\n');

export const profileAnalyze: QueuedJobDefinition<ProfileAnalyzeData> = {
    kind: 'queued',
    name: 'profile-analyze',
    handler: async ({ data, serverRuntime }) => {
        try {
            const { chatMessageId } = data;

            // Idempotency — a redelivery (pg-boss at-least-once) re-runs the
            // handler. Short-circuit if we already analyzed this message.
            const [existing] = await serverRuntime.db
                .select({ chatMessageId: profileMessageAnalysis.chatMessageId })
                .from(profileMessageAnalysis)
                .where(eq(profileMessageAnalysis.chatMessageId, chatMessageId))
                .limit(1);
            if (existing) return;

            // Load the target message + its body.
            const [target] = await serverRuntime.db
                .select({
                    chatId: chatMessages.chatId,
                    createdAt: chatMessages.createdAt,
                    body: chatMessagesUser.body,
                })
                .from(chatMessages)
                .innerJoin(chatMessagesUser, eq(chatMessagesUser.chatMessageId, chatMessages.chatMessageId))
                .where(eq(chatMessages.chatMessageId, chatMessageId))
                .limit(1);
            if (!target) {
                serverRuntime.log.warn(`profileAnalyze: message ${chatMessageId} not found (deleted?)`);
                return;
            }

            // Small rolling context — the last few user messages in this chat
            // (excluding the target). Pure user-side so we don't smear in the
            // assistant's own reasoning, which would bias the analyzer.
            const contextRows = await serverRuntime.db
                .select({ createdAt: chatMessages.createdAt, body: chatMessagesUser.body })
                .from(chatMessages)
                .innerJoin(chatMessagesUser, eq(chatMessagesUser.chatMessageId, chatMessages.chatMessageId))
                .where(and(eq(chatMessages.chatId, target.chatId), lt(chatMessages.createdAt, target.createdAt)))
                .orderBy(asc(chatMessages.createdAt))
                .limit(6);
            const contextBlock = contextRows.length > 0 ? contextRows.map((r) => `- ${r.body}`).join('\n') : '(no prior context)';

            const model = serverRuntime.ai.profileAnalyzerModel();
            const userPrompt = [
                'Recent context (oldest first):',
                contextBlock,
                '',
                'New message to analyze:',
                target.body,
                '',
                'Return only the observations array.',
            ].join('\n');

            const result = await generateObject({
                model,
                schema: OBSERVATION_SCHEMA,
                instructions: SYSTEM_PROMPT,
                prompt: userPrompt,
            });

            const observations = result.object.observations;
            const analyzerModelId = result.response.modelId;

            for (const obs of observations) {
                await profileObservationCreate(
                    {
                        sourceChatMessageId: chatMessageId,
                        category: obs.category,
                        content: obs.content,
                        confidence: obs.confidencePercent ?? null,
                        analyzerModelId,
                    },
                    serverRuntime,
                );
            }

            const analysisRow: ProfileMessageAnalysisCreate = {
                chatMessageId,
                observationsCreated: observations.length,
                analyzerModelId,
                analyzedAt: new Date(),
            };
            await serverRuntime.db.insert(profileMessageAnalysis).values(analysisRow).onConflictDoNothing();

            // Threshold auto-trigger. Read the current counter; if we crossed,
            // enqueue the synthesizer. The synthesizer resets the counter so a
            // burst of admin messages doesn't enqueue it ten times.
            const profileRow = await profileGet(serverRuntime.db);
            if (profileRow.observationsSinceSynthesis >= PROFILE_SYNTHESIS_THRESHOLD) {
                await serverRuntime.jobs.enqueue(profileSynthesize, { reason: 'threshold' });
            }
        } catch (error) {
            // Analyzer failures must not poison the chat path. Log and move on.
            serverRuntime.log.error(error, null);
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 120,
    },
};
