import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '../db';
import { ADMIN_CHAT_MODEL_FALLBACK_ID, isAdminChatModelId } from '../agents/adminChatModels';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { PubSubPostgres } from '../graphql/PubSubPostgres';
import { jobEnqueue } from '../jobs/boss';
import { emailServiceCreate } from '../services/emailServiceCreate';
import { browserCapture } from '../utils/browserCapture';
import { loggerCreate } from '../utils/loggerCreate';
import type { ServerRuntime } from './ServerRuntime';

export function serverRuntimeCreate(): ServerRuntime {
    const postgresPubSub = new PubSubPostgres({ db });

    async function publish(keys: Array<string> | string, payload: any) {
        await (typeof keys === 'string'
            ? postgresPubSub.publish(keys, payload)
            : Promise.all(keys.map((key: string) => postgresPubSub.publish(key, payload))));
    }

    // Fail-fast: a real-app boot without the Google key is broken — surface it
    // here, with provider-specific context, instead of letting the AI SDK read
    // `process.env.GOOGLE_GENERATIVE_AI_API_KEY` implicitly on the first agent
    // call. Tests build a `ServerRuntime` directly and skip this path entirely.
    const googleApiKey = environmentVariables.googleGenerativeAiApiKey;
    if (!googleApiKey) {
        throw new Error(
            'Missing required environment variable: GOOGLE_GENERATIVE_AI_API_KEY (required by serverRuntimeCreate for the Gemini language model)',
        );
    }
    const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

    const serverRuntime: ServerRuntime = {
        db,
        log: loggerCreate(db),
        subscribe: {
            to: (key: string) => postgresPubSub.asyncIterableIterator([key]),
        },
        publish: {
            userUpdates: ({ userId }) => publish(userId, {}),
            // Channel namespaced so a generationId reused as both a chat-update
            // key and (hypothetically) some other key wouldn't collide. The
            // `PubSubPostgres` transport lower-cases the channel name; a UUIDv4
            // is already lower-case so the prefix is the only case-sensitive
            // part. Wire payload is the lean `ChatUpdateWirePayload` — the
            // subscription resolver re-loads the row and maps to the full
            // `GqlSChatUpdate` before handing it to subscribers.
            chatUpdates: ({ generationId, payload }) => publish(`chat-updates:${generationId}`, payload),
        },
        jobs: {
            enqueue: jobEnqueue,
        },
        ai: {
            // Bound here so provider, credentials, and the catalog validation
            // live in one place. The admin composer passes a `modelId`
            // per-turn (see `agentPersonalAssistant`); visitor calls omit it
            // and get the fallback. An id outside the catalog fails fast
            // here — same fail-fast posture as the missing-API-key check
            // above.
            userConversationModel: (modelId?: string) => {
                const resolved = modelId ?? ADMIN_CHAT_MODEL_FALLBACK_ID;
                if (!isAdminChatModelId(resolved)) {
                    throw new Error(`Unknown chat model id: ${resolved}`);
                }
                return google(resolved);
            },
            // The analyzer runs once per admin user message — pick a cheap
            // fast model. See `docs/features/profile.md`.
            profileAnalyzerModel: () => google('gemini-2.5-flash'),
            // The synthesizer reads every active observation and rewrites
            // four text fields; runs only when the threshold trips or on
            // explicit request, so a more capable model is worth it.
            profileSynthesizerModel: () => google('gemini-2.5-pro'),
            // Google Search grounding. Gemini executes the search itself
            // and rides the result back on the same tool-call channel as
            // function tools; we just hand the agent the tool object. The
            // provider binding stays here so `@ai-sdk/google` is not imported
            // from agent files. See `docs/features/chat-web-search.md`.
            webSearchTool: () => google.tools.googleSearch({}),
        },
        browser: {
            // The renderer is a long-lived singleton inside `browserCapture`;
            // `serverRuntimeCreate` just exposes the entry point. Tests build
            // a `ServerRuntime` directly and stub `browser.capture` — they
            // never launch a real Chromium.
            capture: browserCapture,
        },
        // Email transport for the visitor chat's email-shaped tools. The
        // factory itself is cheap — the Resend client is only constructed
        // on the first `sendEmail` call, so a runtime that never calls into
        // it never reads `RESEND_API_KEY`. Tests stub this with a fake.
        emailService: emailServiceCreate(),
    };

    return serverRuntime;
}
