import { createFileRoute, Link } from '@tanstack/react-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import { ArrowLeftIcon, MessageSquareTextIcon } from 'lucide-react';
import { useQuery } from 'urql';
import type { TranscriptMessage } from '../../../web/chat/chatTranscript';
import { groupMessagesByDate, mergeTranscriptMessages } from '../../../web/chat/chatTranscript';
import { GlassCard } from '../../../web/components/GlassCard';
import { Spinner } from '../../../web/components/base/spinner';
import { ChatMessage } from '../../../web/components/chat-message';
import type { GqlCWorkspaceVisitorChatQuery } from '../../../web/graphql/generated';
import { WorkspaceVisitorChatDocument, WorkspaceVisitorChatsDocument } from '../../../web/graphql/generated';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';
import type { Locale } from '../../../web/utils/locale';

// Admin review of what website visitors are asking the AI assistant. Lists
// every visitor chat (newest first) and lets the admin open a single
// transcript read-only — no composer, no live subscription, no interactive
// collection/approval UI. Authorization is the parent `guardAdmin` chain on
// the GraphQL `admin.publicChats` / `admin.publicChat` queries; this route
// itself is `noindex` and (Phase 2) sits behind the workspace OAuth gate.
// See `docs/features/chat-visitor.md`.

const title = { de: 'Besucher-Chats', en: 'Visitor chats' };
const description = {
    de: 'Übersicht aller Konversationen, die Besucher mit dem KI-Assistenten geführt haben.',
    en: 'Every conversation visitors have had with the AI assistant.',
};
const untitled = { de: 'Ohne Titel', en: 'Untitled' };
const loadFailed = { de: 'Chat konnte nicht geladen werden:', en: 'Failed to load chat:' };

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

export const Route = createFileRoute('/{-$locale}/workspace/visitor-chats')({
    validateSearch: (search: Record<string, unknown>) => ({ chatId: typeof search.chatId === 'string' ? search.chatId : undefined }),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/visitor-chats',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { chatId } = Route.useSearch();
        const locale = useLocale();
        return (
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-4xl mx-auto w-full pb-16">
                {chatId ? <VisitorChatDetail chatId={chatId} locale={locale} /> : <VisitorChatsList locale={locale} />}
            </main>
        );
    },
});

function VisitorChatsList({ locale }: { locale: Locale }) {
    const [{ data, fetching, error }] = useQuery({
        query: WorkspaceVisitorChatsDocument,
        requestPolicy: 'cache-and-network',
    });

    const chats = data?.admin.publicChats ?? [];

    return (
        <section className="py-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title[locale]}</h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">{description[locale]}</p>

            {error ? (
                <p className="mt-8 text-sm text-destructive">
                    {loadFailed[locale]} {error.message}
                </p>
            ) : null}
            {fetching && chats.length === 0 ? (
                <div className="mt-10 grid place-items-center py-8">
                    <Spinner className="size-4 text-muted-foreground" />
                </div>
            ) : null}

            {!fetching && chats.length === 0 ? (
                <p className="mt-10 text-sm text-muted-foreground">
                    {{ de: 'Noch keine Besucher-Chats.', en: 'No visitor chats yet.' }[locale]}
                </p>
            ) : null}

            <ul className="mt-8 flex flex-col gap-2">
                {chats.map((chat) => {
                    const relative = formatDistanceToNow(parseISO(chat.lastModifiedAt as unknown as string), {
                        addSuffix: true,
                        locale: DATE_FNS_LOCALE[locale],
                    });
                    const chatTitle = chat.title.trim() ? chat.title : untitled[locale];
                    return (
                        <li key={chat.chatId}>
                            <Link
                                to="/{-$locale}/workspace/visitor-chats"
                                search={{ chatId: chat.chatId }}
                                className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-background/60 px-4 py-3 transition hover:bg-foreground/5 dark:border-white/10 dark:hover:bg-white/8"
                            >
                                <MessageSquareTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate font-medium text-foreground">{chatTitle}</span>
                                    <span className="text-xs text-muted-foreground">{relative}</span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function VisitorChatDetail({ chatId, locale }: { chatId: string; locale: Locale }) {
    const [{ data, fetching, error }] = useQuery({
        query: WorkspaceVisitorChatDocument,
        variables: { chatId },
        requestPolicy: 'cache-and-network',
    });

    const chat = data?.admin.publicChat;

    return (
        <section className="py-10">
            <Link
                to="/{-$locale}/workspace/visitor-chats"
                search={{ chatId: undefined }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeftIcon className="size-4" />
                {{ de: 'Zurück zur Liste', en: 'Back to list' }[locale]}
            </Link>

            {error ? (
                <p className="mt-8 text-sm text-destructive">
                    {loadFailed[locale]} {error.message}
                </p>
            ) : null}
            {fetching && !chat ? (
                <div className="mt-10 grid place-items-center py-8">
                    <Spinner className="size-4 text-muted-foreground" />
                </div>
            ) : null}

            {chat ? (
                <>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">{chat.title.trim() || untitled[locale]}</h1>
                    <GlassCard className="mt-6 px-4 py-6">
                        <ReadOnlyTranscript chat={chat} />
                    </GlassCard>
                </>
            ) : null}
        </section>
    );
}

// Read-only transcript renderer. Uses the same `ChatMessage` component the
// live surfaces use, but never passes `onCollectionSubmit` / `onApprovalRespond`
// so collection forms and approval requests render as static records. There
// are no `appendedMessages` or `streamingTexts` — this view is a snapshot of
// what's already persisted.
function ReadOnlyTranscript({ chat }: { chat: NonNullable<NonNullable<GqlCWorkspaceVisitorChatQuery['admin']>['publicChat']> }) {
    const allMessages = mergeTranscriptMessages(chat.messages, [] as ReadonlyArray<TranscriptMessage>);
    const groupedMessages = groupMessagesByDate(allMessages);
    return (
        <div className="flex min-w-0 flex-col gap-6">
            {groupedMessages.map((group) => (
                <section key={group.date} className="flex min-w-0 flex-col gap-4">
                    <DateSeparator iso={group.date} />
                    {group.messages.map((message) => (
                        <ChatMessage
                            key={message.chatMessageId}
                            message={message}
                            isInteractiveCollection={false}
                            collectionUserInput={undefined}
                            onCollectionSubmit={() => {}}
                            onApprovalRespond={undefined}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}

function DateSeparator({ iso }: { iso: string }) {
    return (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <time dateTime={iso}>{format(parseISO(iso), 'PP')}</time>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}
