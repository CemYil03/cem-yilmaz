import { generateText, Output } from 'ai';
import { and, asc, desc, eq, lt } from 'drizzle-orm';
import { z } from 'zod';
import { COMPASS_SINGLETON_ID, COMPASS_SYNTHESIS_THRESHOLD } from '../../agents/compassConfig';
import { compassInterviewTopics } from '../../agents/compassInterviewConfig';
import { compassObservationCreate } from '../../commands/compassObservationCreate';
import {
    chatMessages,
    chatMessagesUser,
    compass,
    compassInterviewMessageAnalysis,
    compassInterviewMessages,
    compassMessageAnalysis,
    compassObservationCategories,
} from '../../db/schema';
import type { CompassInterviewMessageAnalysisCreate, CompassMessageAnalysisCreate } from '../../db/schema';
import type { ServerRuntime } from '../../domain/ServerRuntime';
import { adminCompassFindOne } from '../../queries/adminCompassFindOne';
import type { QueuedJobDefinition } from '../types';
import { compassSynthesize } from './compassSynthesize';

// One enqueue per source user message — either an admin chat user message
// (`chatMessageId`) or a psychological-interview user turn
// (`interviewMessageId`). Exactly one of the two is set per enqueue; the
// handler branches on which one is present.
//
// The handler:
//   1. Bails if the message has already been analyzed (idempotent re-runs).
//   2. Loads the message body plus a small rolling context.
//   3. Asks the analyzer LLM to extract zero-or-more observations — explicit
//      "return nothing if nothing is new" instruction in the prompt to fight
//      the model's bias toward producing output.
//   4. Persists each observation with the matching source FK; records the
//      per-message analysis row in the matching idempotency table.
//   5. Auto-enqueues `compassSynthesize` if the counter crossed the threshold.
//
// Errors are logged and swallowed: a failed analyzer pass must NEVER block the
// chat path or the interview path. The originating surface already returned
// to the user by the time this runs.
//
// See `docs/features/compass.md`.

interface CompassAnalyzeChatData {
    chatMessageId: string;
    interviewMessageId?: never;
}
interface CompassAnalyzeInterviewData {
    chatMessageId?: never;
    interviewMessageId: string;
}
type CompassAnalyzeData = CompassAnalyzeChatData | CompassAnalyzeInterviewData;

const OBSERVATION_SCHEMA = z.object({
    observations: z
        .array(
            z.object({
                // Tight free-text categorization keeps the LLM honest. The
                // enum is identical to the DB / GraphQL one.
                category: z.enum(compassObservationCategories),
                content: z.string().describe('One concrete observation. Specific phrasing — quote when psychological.'),
                confidencePercent: z.number().int().min(0).max(100).optional().describe('How confident you are, 0–100.'),
            }),
        )
        .describe('Zero or more observations. RETURN AN EMPTY ARRAY when the message reveals nothing new.'),
    scheduleHint: z
        .object({
            topic: z.enum(compassInterviewTopics),
            daysFromNow: z.number().int().min(1).max(21),
            reason: z.string().describe('One sentence — what signal triggered this. e.g. "mentioned upcoming career decision next month"'),
        })
        .optional()
        .describe(
            'Set ONLY when the message contains a clear time-sensitive signal (upcoming event, concrete deadline, acute stressor) ' +
                'that warrants a follow-up interview sooner than the regular cadence. OMIT for normal chat — only fire when timing matters.',
        ),
});

const SYSTEM_PROMPT_CHAT = [
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
    '',
    'Schedule hint (scheduleHint field):',
    '- Set this ONLY when the message reveals a clear time-sensitive signal: an upcoming decision, concrete',
    '  deadline, or acute stressor that warrants a follow-up interview before the next regular cadence.',
    '- Choose the topic that best fits the signal (career, relationships, fitness, health, stress, general).',
    '- Set `daysFromNow` to roughly when the signal matures (e.g. 3 for "deciding this weekend").',
    '- OMIT for normal conversation — most messages do not warrant a hint.',
].join('\n');

// The interview variant: same task, but the source is a directed-question
// transcript where the interviewer's question is the meaningful context for
// the reply. Tell the model that explicitly so it doesn't treat the question
// itself as Cem's signal, and so it weights the answer against the question
// being asked.
const SYSTEM_PROMPT_INTERVIEW = [
    'You are a careful profiler reading one new reply from Cem (the owner of cem-yilmaz.de) during a directed psychological interview about his current state.',
    '',
    'Your job: extract concrete observations ONLY when the reply reveals something about Cem — his state of mind, stressors, energy, what he is focused on, what is shifting in his life.',
    '',
    "The recent transcript below shows the interviewer's questions and Cem's prior replies. Use the questions as context — they tell you what Cem is responding TO — but only extract observations from Cem's own words, never from the questions themselves.",
    '',
    'Categories:',
    '- factual: concrete facts (skills, preferences, life events, plans, tools).',
    '- behavioral: communication style, decision patterns, working habits.',
    '- psychological: state of mind, stress markers, emotional themes, recurring concerns. Quote phrasing.',
    '',
    'Rules:',
    '- Lean toward psychological / behavioral here — the interview was set up to probe exactly that. Factual is fine when he volunteers concrete biography.',
    "- A short, surface-level answer ('fine', 'nothing much') is a legitimate signal too — log it sparingly as psychological when it reads as deflection, otherwise return [].",
    '- Do NOT invent. If unsure whether a thing is new or revealing, omit it.',
    '- Each observation is one self-contained sentence. No lists, no markdown.',
    '- Quote his own words when categorizing as psychological so synthesis can preserve voice.',
    '',
    'Schedule hint (scheduleHint field):',
    '- Set this ONLY when a reply reveals a clear time-sensitive signal: an upcoming decision, concrete',
    '  deadline, or acute stressor that warrants a follow-up interview before the next regular cadence.',
    '- Choose the topic that best fits the signal (career, relationships, fitness, health, stress, general).',
    '- Set `daysFromNow` to roughly when the signal matures.',
    '- OMIT for normal interview replies — most answers do not warrant a hint.',
].join('\n');

// Persist an AI-suggested schedule hint to the Compass singleton row. Only
// updates if the suggested date is earlier than the current hint (or if no
// hint exists), so whichever signal fires first wins rather than last.
async function maybeUpdateScheduleHint(
    hint: { topic: string; daysFromNow: number; reason: string } | undefined,
    now: Date,
    serverRuntime: ServerRuntime,
): Promise<void> {
    if (!hint) return;
    const scheduledAt = new Date(now.getTime() + hint.daysFromNow * 86_400 * 1000);

    const [existing] = await serverRuntime.db
        .select({ scheduledInterviewAt: compass.scheduledInterviewAt })
        .from(compass)
        .where(eq(compass.compassId, COMPASS_SINGLETON_ID))
        .limit(1);

    // Only overwrite if the new hint fires sooner (or nothing is set yet).
    if (existing?.scheduledInterviewAt && existing.scheduledInterviewAt <= scheduledAt) return;

    await serverRuntime.db
        .update(compass)
        .set({
            scheduledInterviewTopic: hint.topic,
            scheduledInterviewAt: scheduledAt,
            scheduledInterviewReason: hint.reason,
            updatedAt: now,
        })
        .where(eq(compass.compassId, COMPASS_SINGLETON_ID));
}

export const compassAnalyze: QueuedJobDefinition<CompassAnalyzeData> = {
    kind: 'queued',
    name: 'compass-analyze',
    handler: async ({ data, serverRuntime }) => {
        try {
            const sourceKind: 'chat' | 'interview' = 'interviewMessageId' in data && data.interviewMessageId ? 'interview' : 'chat';

            if (sourceKind === 'chat') {
                await analyzeChatMessage((data as CompassAnalyzeChatData).chatMessageId, serverRuntime);
            } else {
                await analyzeInterviewMessage((data as CompassAnalyzeInterviewData).interviewMessageId, serverRuntime);
            }

            // Threshold auto-trigger. Read the current counter; if we crossed,
            // enqueue the synthesizer. The synthesizer resets the counter so a
            // burst of admin messages doesn't enqueue it ten times.
            const compassRow = await adminCompassFindOne(serverRuntime.db);
            if (compassRow.observationsSinceSynthesis >= COMPASS_SYNTHESIS_THRESHOLD) {
                await serverRuntime.jobs.enqueue(compassSynthesize, { reason: 'threshold' });
            }
        } catch (error) {
            // Analyzer failures must not poison the chat or interview path.
            // Log and move on.
            serverRuntime.log.error(error, null);
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 120,
    },
};

async function analyzeChatMessage(chatMessageId: string, serverRuntime: ServerRuntime): Promise<void> {
    // Idempotency — a redelivery (pg-boss at-least-once) re-runs the
    // handler. Short-circuit if we already analyzed this message.
    const [existing] = await serverRuntime.db
        .select({ chatMessageId: compassMessageAnalysis.chatMessageId })
        .from(compassMessageAnalysis)
        .where(eq(compassMessageAnalysis.chatMessageId, chatMessageId))
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
        serverRuntime.log.warn(`compassAnalyze: chat message ${chatMessageId} not found (deleted?)`);
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

    const model = serverRuntime.ai.compassAnalyzerModel();
    const userPrompt = [
        'Recent context (oldest first):',
        contextBlock,
        '',
        'New message to analyze:',
        target.body,
        '',
        'Return only the observations array.',
    ].join('\n');

    const result = await generateText({
        model,
        output: Output.object({ schema: OBSERVATION_SCHEMA }),
        system: SYSTEM_PROMPT_CHAT,
        prompt: userPrompt,
    });

    const observations = result.output.observations;
    const analyzerModelId = result.response.modelId;

    for (const obs of observations) {
        await compassObservationCreate(
            {
                sourceChatMessageId: chatMessageId,
                sourceInterviewMessageId: null,
                category: obs.category,
                content: obs.content,
                confidence: obs.confidencePercent ?? null,
                analyzerModelId,
            },
            serverRuntime,
        );
    }

    const analysisRow: CompassMessageAnalysisCreate = {
        chatMessageId,
        observationsCreated: observations.length,
        analyzerModelId,
        analyzedAt: new Date(),
    };
    await serverRuntime.db.insert(compassMessageAnalysis).values(analysisRow).onConflictDoNothing();

    await maybeUpdateScheduleHint(result.output.scheduleHint, new Date(), serverRuntime);
}

async function analyzeInterviewMessage(interviewMessageId: string, serverRuntime: ServerRuntime): Promise<void> {
    // Idempotency — sibling table to `CompassMessageAnalysis` keyed on
    // `interviewMessageId`. Splitting the table (rather than a nullable
    // two-FK shape) keeps the PK / cascade trivial.
    const [existing] = await serverRuntime.db
        .select({ interviewMessageId: compassInterviewMessageAnalysis.interviewMessageId })
        .from(compassInterviewMessageAnalysis)
        .where(eq(compassInterviewMessageAnalysis.interviewMessageId, interviewMessageId))
        .limit(1);
    if (existing) return;

    // Load the target message + the parent interview id so we can pull
    // rolling context from the same interview.
    const [target] = await serverRuntime.db
        .select({
            interviewId: compassInterviewMessages.interviewId,
            role: compassInterviewMessages.role,
            content: compassInterviewMessages.content,
            createdAt: compassInterviewMessages.createdAt,
        })
        .from(compassInterviewMessages)
        .where(eq(compassInterviewMessages.interviewMessageId, interviewMessageId))
        .limit(1);
    if (!target) {
        serverRuntime.log.warn(`compassAnalyze: interview message ${interviewMessageId} not found (deleted?)`);
        return;
    }
    if (target.role !== 'user') {
        // Assistant messages don't get analyzed — the interviewer's own
        // questions are not signal. Defensive: the command only enqueues
        // for user turns.
        return;
    }

    // Rolling context for interview analysis includes BOTH user and
    // assistant turns — the interviewer's question is exactly the context
    // that gives the reply its meaning. Pull the last six turns prior to
    // the target, oldest first.
    const contextRows = await serverRuntime.db
        .select({
            role: compassInterviewMessages.role,
            content: compassInterviewMessages.content,
            createdAt: compassInterviewMessages.createdAt,
        })
        .from(compassInterviewMessages)
        .where(and(eq(compassInterviewMessages.interviewId, target.interviewId), lt(compassInterviewMessages.createdAt, target.createdAt)))
        .orderBy(desc(compassInterviewMessages.createdAt))
        .limit(6);
    // Pulled `desc` for the LIMIT to grab the most recent six; reverse for
    // oldest-first in the prompt.
    const contextBlock =
        contextRows.length > 0
            ? contextRows
                  .slice()
                  .reverse()
                  .map((r) => `- [${r.role}] ${r.content}`)
                  .join('\n')
            : '(no prior context — this is the first reply)';

    const model = serverRuntime.ai.compassAnalyzerModel();
    const userPrompt = [
        'Recent interview transcript (oldest first):',
        contextBlock,
        '',
        "New reply from Cem to analyze (the assistant's question right above was what he was answering):",
        target.content,
        '',
        'Return only the observations array.',
    ].join('\n');

    const result = await generateText({
        model,
        output: Output.object({ schema: OBSERVATION_SCHEMA }),
        system: SYSTEM_PROMPT_INTERVIEW,
        prompt: userPrompt,
    });

    const observations = result.output.observations;
    const analyzerModelId = result.response.modelId;

    for (const obs of observations) {
        await compassObservationCreate(
            {
                sourceChatMessageId: null,
                sourceInterviewMessageId: interviewMessageId,
                category: obs.category,
                content: obs.content,
                confidence: obs.confidencePercent ?? null,
                analyzerModelId,
            },
            serverRuntime,
        );
    }

    const analysisRow: CompassInterviewMessageAnalysisCreate = {
        interviewMessageId,
        observationsCreated: observations.length,
        analyzerModelId,
        analyzedAt: new Date(),
    };
    await serverRuntime.db.insert(compassInterviewMessageAnalysis).values(analysisRow).onConflictDoNothing();

    await maybeUpdateScheduleHint(result.output.scheduleHint, new Date(), serverRuntime);
}
