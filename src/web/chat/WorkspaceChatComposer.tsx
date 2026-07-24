import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '../components/base/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../components/base/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/base/select';
import { WorkspaceChatMessageCreateDocument } from '../graphql/generated';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { ChatComposer } from './ChatComposer';
import { chatContextTokensUsed, formatTokenCount } from './chatContextUsage';
import type { TranscriptMessage } from './chatTranscript';
import { mergeTranscriptMessages } from './chatTranscript';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';

// Admin-namespace composer used on every workspace surface that lets the
// user send a message — the hub composer on `/workspace`, the sidebar
// composer mounted at the workspace layout, and the composer on the
// per-chat deep-link route `/workspace/assistant/<chatId>`. It is a thin
// wrapper around `<ChatComposer />` that:
//
// - dispatches the workspace `chatMessageCreate` mutation (so the server
//   routes to `agentPersonalAssistant` — see
//   `docs/features/chat-workspace.md`);
// - pulls the model catalog + selected model id from the workspace
//   assistant chat provider, so the same dropdown choice is reflected on
//   every surface and a change is persisted as the new sticky default
//   (see `docs/features/admin-chat-config.md`);
// - renders the model dropdown, the tool-call approval-mode selector, and
//   a compact context-window usage ring into the bottom-left addon slot —
//   these are admin-only controls, so they live in this wrapper rather
//   than the audience-agnostic base;
// - leaves `chatId`, `addonStart` (optional surface-specific extras like
//   the sheet's "new chat" button), `onMessageSent`, and the live-updates
//   wiring to the caller — the three surfaces differ on those points
//   (hub: new chat per send, sheet: provider-owned chatId + reset
//   button, route: URL-owned chatId).
//
// Visitor surfaces don't get this composer — they use
// `<VisitorChatComposer />`.

// `auto` lets the assistant invoke tools directly; `manual` flips
// `requireToolCallApprovals` so each call surfaces an approval message in the
// transcript before it runs.
type ToolCallApprovalMode = 'auto' | 'manual';

/** Warn on the ring once the last prompt used ≥ 85% of the window. */
const CONTEXT_WARN_RATIO = 0.85;

interface WorkspaceChatComposerProps {
    locale: Locale;
    /** Optional — undefined means "first send creates a new chat". */
    chatId?: string;
    /** Use the caller's `useChatLiveUpdates` handle (route composers) or
     *  the provider's (hub/sheet). Both expose the same shape. */
    isLocked: boolean;
    beginTurn: (chatId?: string) => string;
    bindTurn: (generationId: string, chatId: string) => void;
    endTurn: (generationId: string) => void;
    /** Forwarded to `ChatComposer` — fired with the chatId returned by
     *  the mutation. */
    onMessageSent?: (chatId: string) => void;
    /** Focus the textarea on mount. */
    autoFocus?: boolean;
    /** Surface-specific addon prepended to the model + approval-mode
     *  selectors — e.g. the sheet's "new chat" button. */
    addonStart?: ReactNode;
    /** Pathname of the workspace route the user was on when sending
     *  (e.g. `/workspace/projects`, `/workspace/projects/abc…`,
     *  `/workspace/cv`). Threaded through to the agent's system prompt
     *  so short references ("this project", "what am I looking at")
     *  resolve against the right surface. The mounting site reads it
     *  from `useLocation().pathname`. */
    currentPagePath?: string;
    /** Merged transcript for the chat this composer is bound to. Used as a
     *  live overlay for `generation.inputTokens` while messages stream in.
     *  Deep-link / sidebar pass their merged messages; the hub omits this. */
    messages?: ReadonlyArray<TranscriptMessage>;
    /** Server-authoritative `Chat.contextTokensUsed` from the page query /
     *  provider. Falls back when the live transcript has no generation
     *  metadata yet (fresh chat, legacy rows). */
    contextTokensUsed?: number | null;
}

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

export function WorkspaceChatComposer({
    locale,
    chatId,
    isLocked,
    beginTurn,
    bindTurn,
    endTurn,
    onMessageSent,
    autoFocus = false,
    addonStart,
    currentPagePath,
    messages: messagesProp,
    contextTokensUsed: contextTokensUsedProp,
}: WorkspaceChatComposerProps) {
    const {
        chatConfig,
        selectedModelId,
        onModelChange,
        chatId: providerChatId,
        loadedMessages,
        live,
        contextTokensUsed: providerContextTokensUsed,
    } = useWorkspaceAssistantChat();
    const [mode, setMode] = useState<ToolCallApprovalMode>('auto');

    // Prefer an explicit transcript from the mounting surface (deep-link /
    // sidebar). Fall back to the provider's loaded + live rows when this
    // composer is bound to the provider's active chat (hub after adopt).
    const messages =
        messagesProp ??
        (chatId && chatId === providerChatId
            ? mergeTranscriptMessages(loadedMessages, live.appendedMessagesFor(chatId) as ReadonlyArray<TranscriptMessage>)
            : []);

    const activeModel = chatConfig.availableModels.find((model) => model.modelId === selectedModelId) ?? chatConfig.availableModels[0];
    const contextWindowTokens = activeModel?.contextWindowTokens ?? 0;
    // Live message overlay wins when present (covers the turn that just
    // landed via SSE). Otherwise the denormalized chat-row value from the
    // server / provider. See `docs/features/admin-chat-config.md`.
    const serverTokensUsed = contextTokensUsedProp ?? (chatId && chatId === providerChatId ? providerContextTokensUsed : null);
    const tokensUsed = chatContextTokensUsed(messages) ?? serverTokensUsed ?? 0;
    const tokensLeft = Math.max(0, contextWindowTokens - tokensUsed);

    return (
        <ChatComposer
            locale={locale}
            chatId={chatId}
            isLocked={isLocked}
            beginTurn={beginTurn}
            bindTurn={bindTurn}
            endTurn={endTurn}
            sendMutation={WorkspaceChatMessageCreateDocument}
            extractResult={extractMessageCreateResult}
            placeholder={{ de: 'Frag deinen Assistenten…', en: 'Ask your assistant…' }[locale]}
            availableModels={chatConfig.availableModels}
            modelId={selectedModelId}
            requireToolCallApprovals={mode === 'manual'}
            onMessageSent={onMessageSent}
            autoFocus={autoFocus}
            currentPagePath={currentPagePath}
            addonStart={
                <>
                    {addonStart}
                    {contextWindowTokens > 0 ? (
                        <ContextWindowStatus
                            locale={locale}
                            tokensUsed={tokensUsed}
                            tokensLeft={tokensLeft}
                            contextWindowTokens={contextWindowTokens}
                        />
                    ) : null}
                    <Select value={selectedModelId} onValueChange={onModelChange} disabled={isLocked}>
                        <SelectTrigger
                            size="sm"
                            aria-label={{ de: 'Modell', en: 'Model' }[locale]}
                            // Cap width so "Gemini 3.1 Pro" truncates instead of
                            // shoving Send past the sidebar composer edge.
                            className="h-7 max-w-30 min-w-0 shrink gap-1 px-1.5 text-xs *:data-[slot=select-value]:truncate"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {chatConfig.availableModels.map((model) => (
                                <SelectItem key={model.modelId} value={model.modelId}>
                                    {model.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={mode} onValueChange={(value) => setMode(value as ToolCallApprovalMode)} disabled={isLocked}>
                        <SelectTrigger
                            size="sm"
                            aria-label="Tool call approval mode"
                            className="h-7 max-w-22 shrink-0 gap-1 px-1.5 text-xs"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                    </Select>
                </>
            }
        />
    );
}

// Compact context-window ring — full ring = 100% of the model window used.
// Exact counts stay on hover so the addon row stays scannable on a narrow
// sidebar (same HoverCard pattern as the visitor daily-quota chip).
function ContextWindowStatus({
    locale,
    tokensUsed,
    tokensLeft,
    contextWindowTokens,
}: {
    locale: Locale;
    tokensUsed: number;
    tokensLeft: number;
    contextWindowTokens: number;
}) {
    const ratio = contextWindowTokens > 0 ? Math.min(1, tokensUsed / contextWindowTokens) : 0;
    const isNearLimit = ratio >= CONTEXT_WARN_RATIO;
    const usedLabel = formatTokenCount(tokensUsed);
    const windowLabel = formatTokenCount(contextWindowTokens);
    const fullText = isNearLimit
        ? {
              de: `Kontext fast voll: ${tokensUsed.toLocaleString('de-DE')} von ${contextWindowTokens.toLocaleString('de-DE')} Tokens genutzt. Noch etwa ${tokensLeft.toLocaleString('de-DE')} übrig.`,
              en: `Context nearly full: ${tokensUsed.toLocaleString('en-US')} of ${contextWindowTokens.toLocaleString('en-US')} tokens used. About ${tokensLeft.toLocaleString('en-US')} left.`,
          }[locale]
        : {
              de: `${tokensUsed.toLocaleString('de-DE')} von ${contextWindowTokens.toLocaleString('de-DE')} Kontext-Tokens genutzt. Noch etwa ${tokensLeft.toLocaleString('de-DE')} übrig.`,
              en: `${tokensUsed.toLocaleString('en-US')} of ${contextWindowTokens.toLocaleString('en-US')} context tokens used. About ${tokensLeft.toLocaleString('en-US')} left.`,
          }[locale];
    const ariaLabel = { de: 'Kontextfenster', en: 'Context window' }[locale];

    return (
        <HoverCard openDelay={100} closeDelay={150}>
            <HoverCardTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    role="status"
                    aria-label={`${ariaLabel}: ${usedLabel} / ${windowLabel}`}
                    className={cn('shrink-0 cursor-help', isNearLimit ? 'text-destructive' : 'text-muted-foreground')}
                >
                    <ContextUsageRing ratio={ratio} nearLimit={isNearLimit} />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="start" className="w-auto max-w-xs text-xs leading-relaxed">
                {fullText}
            </HoverCardContent>
        </HoverCard>
    );
}

/** 14px SVG ring — track + progress arc. `ratio` 0…1; full = window exhausted. */
function ContextUsageRing({ ratio, nearLimit }: { ratio: number; nearLimit: boolean }) {
    const size = 14;
    const stroke = 2;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(1, Math.max(0, ratio));
    const offset = circumference * (1 - clamped);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                className="text-muted-foreground/25"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={nearLimit ? 'text-destructive' : 'text-foreground/70'}
            />
        </svg>
    );
}
