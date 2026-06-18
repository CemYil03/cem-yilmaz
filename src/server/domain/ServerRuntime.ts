import type { LanguageModel } from 'ai';
import type { Database, DatabaseTransaction } from '../db';
import type { GqlSChatUpdate } from '../graphql/generated';
import type { QueuedJobDefinition } from '../jobs/types';
import type { BrowserCaptureOptions } from '../utils/browserCapture';
import type { Logger } from '../utils/loggerCreate';

export interface ServerRuntime {
    db: Database;
    log: Logger;
    subscribe: {
        to: (key: string) => AsyncIterableIterator<any>;
    };
    publish: {
        userUpdates: (args: { userId: string }) => Promise<void>;
        chatUpdates: (args: { generationId: string; update: GqlSChatUpdate }) => Promise<void>;
    };
    jobs: {
        enqueue: <TData>(
            definition: QueuedJobDefinition<TData>,
            data: TData,
            options?: { startAfter?: Date | string | number; transaction?: DatabaseTransaction },
        ) => Promise<string | null>;
    };
    // LLM clients are exposed as factory functions on the runtime so the
    // provider, model id, and API key are bound in exactly one place
    // (`serverRuntimeCreate`). Tests build a runtime backed by a `MockLanguageModelV3`
    // and never reach a real LLM endpoint — see `commandTestUtils.ts` /
    // `serverRuntimeStubCreate` in command tests.
    ai: {
        userConversationModel: () => LanguageModel;
    };
    // Server-side rendering capability — drives a singleton headless
    // Chromium against an internal `/server/*` route to produce an image
    // of the rendered React UI. See
    // `docs/architecture/server-side-rendering.md`. Tests inject a stub
    // that returns a fixed `Buffer` and never launch a real browser.
    browser: {
        capture: (options: BrowserCaptureOptions) => Promise<Buffer>;
    };
}
