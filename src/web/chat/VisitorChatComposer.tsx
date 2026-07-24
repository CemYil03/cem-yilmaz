import { formatDistanceToNow, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import { useQuery } from 'urql';
import { Button } from '../components/base/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/base/popover';
import { ChatMessageCreateDocument, VisitorChatQuotaDocument } from '../graphql/generated';
import type { GqlCVisitorChatQuotaFieldsFragment } from '../graphql/generated';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';
import { ChatComposer } from './ChatComposer';

// Visitor-facing chat composer. Wraps `<ChatComposer />` and pre-wires the
// visitor `chatMessageCreate` mutation + its result extractor so the server
// dispatches to `agentVisitor`. Mirrors `<WorkspaceChatComposer />`
// in shape but with none of the admin-only controls (model dropdown,
// approval-mode selector, file attachments).
//
// The composer also owns the **rate-limit chrome**: it queries
// `VisitorChatQuota`, renders the quota line in the bottom-left addon slot
// so the visitor always sees their daily allowance, and locks the input
// when the daily cap is reached. The query is `cache-and-network` so
// reopening or remounting the composer picks up the latest state without
// a hard reload.

interface VisitorChatComposerProps {
    locale: Locale;
    /** Optional — undefined means "first send creates a new chat". */
    chatId?: string;
    /** Fired with the chatId returned by the mutation. The sheet uses this
     *  to transition from empty to loaded; the seeded-send path on the
     *  landing page uses a different code path (the provider's intent
     *  machine) and goes through `<MessageComposer />` directly. */
    onMessageSent?: (chatId: string) => void;
    /** True when a turn fired through this composer (or another flow) is
     *  in flight. ORed with the at-limit gate to drive the composer's
     *  locked state. */
    isLocked: boolean;
    beginTurn: (chatId?: string) => string;
    bindTurn: (generationId: string, chatId: string) => void;
    endTurn: (generationId: string) => void;
    /** Localized placeholder. The two sheet surfaces use different copy
     *  ("Ask a question…" on the empty state, "Ask another question…"
     *  on the loaded view), so this is passed in rather than baked in. */
    placeholder: string;
    /** Focus the textarea on mount. */
    autoFocus?: boolean;
    /** Surface-specific addon rendered to the LEFT of the always-visible
     *  quota line. The sheet's loaded view uses this for the "New chat"
     *  button. */
    addonStart?: ReactNode;
    /** Pathname of the page the visitor was on when they sent the message
     *  (`/projects`, `/en/cv`, `/`). Forwarded to the agent's system
     *  prompt so it can anchor answers to whatever the visitor was just
     *  looking at. The sheet that mounts this composer reads it from
     *  `useLocation().pathname` and threads it through. */
    currentPagePath?: string;
}

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { chatMessageCreate?: { chatId: string } | null } | null | undefined;
    return wrapper?.chatMessageCreate ?? null;
};

export function VisitorChatComposer({
    locale,
    chatId,
    onMessageSent,
    isLocked,
    beginTurn,
    bindTurn,
    endTurn,
    placeholder,
    autoFocus = false,
    addonStart,
    currentPagePath,
}: VisitorChatComposerProps) {
    // `cache-and-network` so the quota line is fresh on every reopen — a
    // visitor who sent their last allowed message yesterday should see the
    // current state, not the stale "limit reached" snapshot from then. The
    // empty-state's previous-chats list runs a separate query; we don't
    // share one here because the loaded view doesn't need the chats list.
    const [{ data }] = useQuery({ query: VisitorChatQuotaDocument, requestPolicy: 'cache-and-network' });
    const quota = data?.sessionFindOne.visitorChatQuotaFindOne ?? null;
    const isAtLimit = quota ? quota.used >= quota.limit : false;

    return (
        <ChatComposer
            locale={locale}
            chatId={chatId}
            isLocked={isLocked || isAtLimit}
            beginTurn={beginTurn}
            bindTurn={bindTurn}
            endTurn={endTurn}
            sendMutation={ChatMessageCreateDocument}
            extractResult={extractMessageCreateResult}
            placeholder={placeholder}
            onMessageSent={onMessageSent}
            autoFocus={autoFocus}
            currentPagePath={currentPagePath}
            addonStart={
                <>
                    {addonStart}
                    <VisitorChatQuotaStatus quota={quota} locale={locale} />
                </>
            }
        />
    );
}

// Quota chip shown bottom-left of the visitor composer. Hidden only while
// the query hasn't resolved yet — once we know the quota we ALWAYS show
// it, even on the first send of the day, so the visitor understands the
// daily cap exists before they hit it.
//
// The visible chip is intentionally short — just `used / limit` — because
// the composer addon row gets cramped on narrow viewports and the previous
// full sentence wrapped or pushed the Send button. A click/tap on the chip
// opens a Popover with the full explanation (Popover, not Tooltip/HoverCard,
// so the detail works on touch as well as desktop). The chip flips to a
// destructive style at the limit so the visitor can see the composer is
// locked without opening the card.
function VisitorChatQuotaStatus({ quota, locale }: { quota: GqlCVisitorChatQuotaFieldsFragment | null; locale: Locale }) {
    if (!quota) return null;
    const isAtLimit = quota.used >= quota.limit;
    const resetsIn = quota.resetsAt
        ? formatDistanceToNow(parseISO(quota.resetsAt as unknown as string), {
              addSuffix: false,
              locale: DATE_FNS_LOCALE[locale],
          })
        : { de: '24 Std.', en: '24 h' }[locale];
    const chipText = `${quota.used} / ${quota.limit}`;
    const fullText = isAtLimit
        ? {
              de: `Tageslimit erreicht (${quota.used} / ${quota.limit}). Neue Nachricht in ${resetsIn} möglich.`,
              en: `Daily limit reached (${quota.used} / ${quota.limit}). You can send again in ${resetsIn}.`,
          }[locale]
        : {
              de: `${quota.used} von ${quota.limit} Nachrichten heute genutzt. Zurückgesetzt in ${resetsIn}.`,
              en: `${quota.used} of ${quota.limit} messages used today. Resets in ${resetsIn}.`,
          }[locale];
    const ariaLabel = isAtLimit
        ? { de: 'Tageslimit erreicht', en: 'Daily limit reached' }[locale]
        : { de: 'Tageslimit für Nachrichten', en: 'Daily message limit' }[locale];
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    role="status"
                    aria-label={`${ariaLabel}: ${chipText}`}
                    className={
                        isAtLimit
                            ? 'text-destructive underline decoration-dotted underline-offset-2 cursor-help'
                            : 'text-muted-foreground underline decoration-dotted underline-offset-2 cursor-help'
                    }
                >
                    {chipText}
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto max-w-xs p-3 text-xs leading-relaxed">
                {fullText}
            </PopoverContent>
        </Popover>
    );
}
