import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '../db';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { PubSubPostgres } from '../graphql/PubSubPostgres';
import { jobEnqueue } from '../jobs/boss';
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
            // part.
            chatUpdates: ({ generationId, update }) => publish(`chat-updates:${generationId}`, update),
        },
        jobs: {
            enqueue: jobEnqueue,
        },
        ai: {
            // Bound here so model id, provider, and credentials live in one
            // place. Swapping models (or adding a second LLM for a specific
            // flow) is a single edit on this object.
            userConversationModel: () => google('gemini-2.5-flash'),
        },
        browser: {
            // The renderer is a long-lived singleton inside `browserCapture`;
            // `serverRuntimeCreate` just exposes the entry point. Tests build
            // a `ServerRuntime` directly and stub `browser.capture` — they
            // never launch a real Chromium.
            capture: browserCapture,
        },
    };

    return serverRuntime;
}
