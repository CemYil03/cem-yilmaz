import type { LanguageModel, Tool } from 'ai';
import type { Database, DatabaseTransaction } from '../db';
import type { ChatUpdateWirePayload } from '../graphql/chatUpdateWirePayload';
import type { CompassInterviewUpdateWirePayload } from '../graphql/compassInterviewUpdateWirePayload';
import type { QueuedJobDefinition } from '../jobs/types';
import type { EmailService } from '../services/emailServiceCreate';
import type { TmdbClient } from '../services/tmdbClientCreate';
import type { YoutubeClient } from '../services/youtubeClientCreate';
import type { BrowserCaptureOptions, BrowserCapturePdfOptions } from '../utils/browserCapture';
import type { Logger } from '../utils/loggerCreate';

export interface ServerRuntime {
    db: Database;
    log: Logger;
    subscribe: {
        to: (key: string) => AsyncIterableIterator<any>;
    };
    publish: {
        userUpdates: (args: { userId: string }) => Promise<void>;
        // Wire payload carries only ids/small primitives — pg_notify caps
        // NOTIFY at 8000 bytes, so we can't put a full `ChatMessage` on the
        // wire (a long user-message body or fat tool-call args blob blows
        // the cap). The subscription resolver re-loads via `chatMessageRowLoad`
        // and maps to `GqlSChatUpdate` before delivery. See
        // `src/server/graphql/chatUpdateWirePayload.ts`.
        chatUpdates: (args: { generationId: string; payload: ChatUpdateWirePayload }) => Promise<void>;
        // Parallel channel for the compass psychological-interview agent
        // (`docs/features/workspace-compass.md`). Keyed on the same ephemeral
        // client-allocated `generationId`, but carries interview-message ids
        // instead of chat-message ids because the interviewer writes to
        // `CompassInterviewMessages` rather than `ChatMessages`. See
        // `src/server/graphql/compassInterviewUpdateWirePayload.ts`.
        compassInterviewUpdates: (args: { generationId: string; payload: CompassInterviewUpdateWirePayload }) => Promise<void>;
    };
    jobs: {
        enqueue: <TData>(
            definition: QueuedJobDefinition<TData>,
            data: TData,
            options?: { startAfter?: Date | string | number; transaction?: DatabaseTransaction },
        ) => Promise<string | null>;
        // Count active (created | retry | active) jobs for a queue. Used to
        // derive live UI flags like `AdminCompass.synthesisInProgress` —
        // pg-boss owns the state, the DB doesn't carry a stale column.
        activeCount: <TData>(definition: QueuedJobDefinition<TData>) => Promise<number>;
    };
    // LLM clients are exposed as factory functions on the runtime so the
    // provider, model id, and API key are bound in exactly one place
    // (`serverRuntimeCreate`). Tests build a runtime backed by a `MockLanguageModelV3`
    // and never reach a real LLM endpoint — see `commandTestUtils.ts` /
    // `serverRuntimeStubCreate` in command tests.
    ai: {
        // `modelId` (optional) selects from the admin chat-model catalog
        // (`src/server/agents/adminChatModels.ts`). When omitted, the runtime
        // returns the catalog's fallback id (`gemini-2.5-flash` today) — that
        // is what the visitor agent uses, which never picks per-turn. Unknown
        // ids fail fast at construction so an invalid choice can't reach the
        // provider.
        userConversationModel: (modelId?: string) => LanguageModel;
        // Cheap model used by the compass analyzer (one call per admin user
        // message). Should be inexpensive and structured-output friendly.
        // See `docs/features/compass.md`.
        compassAnalyzerModel: () => LanguageModel;
        // Cheap model used by the chat-title generator (one call per
        // assistant turn while the title is still empty). Bounded,
        // low-stakes summarization — the flagship tier would be overkill.
        // See `docs/features/chat-titles.md`.
        chatTitlerModel: () => LanguageModel;
        // More capable model for the periodic compass synthesizer. Runs far
        // less often than the analyzer (threshold-triggered) and reads every
        // active observation, so the higher per-call cost is amortized.
        compassSynthesizerModel: () => LanguageModel;
        // Drives the recurring psychological-interview agent. Runs only
        // a handful of turns per interview and the question quality matters
        // (the agent has to probe for gaps in the existing compass without
        // being repetitive), so the higher-tier model is justified. See
        // `docs/features/compass.md` ("Psychological-interview agent").
        compassInterviewerModel: () => LanguageModel;
        // Provider-executed web search. Gemini runs the search server-side
        // and rides the call back through the normal `step.toolCalls` /
        // `step.toolResults` channel — there is no `execute` we own. Citations
        // come back on `providerMetadata.google.groundingMetadata`. Exposed
        // as a factory so the provider binding lives in one place; agents
        // wrap it via `src/server/agents/toolWebSearch.ts`. See
        // `docs/features/chat-web-search.md`.
        webSearchTool: () => Tool;
    };
    // Server-side rendering capability — drives a singleton headless
    // Chromium against an internal `/server/*` route to produce an image
    // (`capture`) or a PDF (`capturePdf`) of the rendered React UI. See
    // `docs/architecture/browser-capture.md`. Tests inject a stub
    // that returns a fixed `Buffer` and never launch a real browser.
    browser: {
        capture: (options: BrowserCaptureOptions) => Promise<Buffer>;
        capturePdf: (options: BrowserCapturePdfOptions) => Promise<Buffer>;
    };
    // Transactional email transport. Lazy: the underlying Resend client is
    // only constructed when a tool actually fires a send, so test runtimes
    // and CI builds work without `RESEND_API_KEY`. The visitor chat's three
    // email-shaped jobs (`emailToCemSend`, `projectRequestOtpSend`,
    // `projectRequestNotifySend`) are the only callers. See
    // `docs/features/chat-email-tools.md`.
    emailService: EmailService;
    // TMDB (The AdminMediaMovie Database) client used by the `/workspace/media` add
    // flow — search-as-you-type and auto-fill poster/release/runtime when
    // the admin picks a match. Missing `TMDB_API_KEY` degrades to
    // empty-search + manual entry (no throw). See
    // `docs/features/workspace-media.md`.
    tmdb: TmdbClient;
    // YouTube Data API v3 client used by the `/workspace/media` channels
    // tab — search-as-you-type and auto-fill avatar/handle/description on
    // channel add. Same posture as `tmdb`: missing `YOUTUBE_API_KEY`
    // degrades to empty search + manual entry.
    youtube: YoutubeClient;
}
