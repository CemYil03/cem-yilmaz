import { createFileRoute, Link } from '@tanstack/react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { formatDate } from '../../../shared';
import { ArrowLeftIcon, MessageSquareTextIcon } from 'lucide-react';
import { z } from 'zod';
import type { TranscriptMessage } from '../../../web/chat/chatTranscript';
import { groupMessagesByDate, mergeTranscriptMessages } from '../../../web/chat/chatTranscript';
import { GlassCard } from '../../../web/components/GlassCard';
import { ChatMessage } from '../../../web/components/chat-message';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type { GqlCWorkspaceVisitorChatQuery, GqlCWorkspaceVisitorChatsQuery } from '../../../web/graphql/generated';
import { WorkspaceVisitorChatDocument, WorkspaceVisitorChatsDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import { localeFromParam } from '../../../web/utils/locale';
import type { Locale } from '../../../web/utils/locale';

// Admin review of what website visitors are asking the AI assistant. Lists
// every visitor chat (newest first) and lets the admin open a single
// transcript read-only — no composer, no live subscription, no interactive
// collection/approval UI. Authorization is the `User.admin` resolver chain on
// the GraphQL queries (returns null for non-admins, the namespace shell
// otherwise); the page falls back to `<WorkspaceUnauthorized />` when the
// chain resolves null. This route itself is also `noindex`.
//
// Data flow: `chatId` lives in the URL. When absent, the loader returns the
// chat list; when present, the loader returns a single chat detail. The
// component just renders whichever shape is in the loader data.
//
// See `docs/features/chat-visitor.md`.

const title = { de: 'Besucher-Chats', en: 'Visitor chats' };
const description = {
    de: 'Übersicht aller Konversationen, die Besucher mit dem KI-Assistenten geführt haben.',
    en: 'Every conversation visitors have had with the AI assistant.',
};
const untitled = { de: 'Ohne Titel', en: 'Untitled' };

const visitorChatsSearchSchema = z.object({
    chatId: z.string().optional(),
});

type VisitorChatsAdmin = NonNullable<NonNullable<GqlCWorkspaceVisitorChatsQuery['sessionFindOne']['user']>['admin']>;
type VisitorChatAdmin = NonNullable<NonNullable<GqlCWorkspaceVisitorChatQuery['sessionFindOne']['user']>['admin']>;

type LoaderData =
    | { kind: 'unauthorized' }
    | { kind: 'list'; chats: VisitorChatsAdmin['adminPublicChatFindMany'] }
    | { kind: 'detail'; chat: VisitorChatAdmin['adminPublicChatFindOne'] | null };

export const Route = createFileRoute('/{-$locale}/workspace/visitor-chats')({
    validateSearch: visitorChatsSearchSchema,
    loaderDeps: ({ search }) => ({ chatId: search.chatId }),
    loader: async ({ deps }): Promise<LoaderData> => {
        if (deps.chatId) {
            const data = await routeLoaderGraphqlClient(WorkspaceVisitorChatDocument, { chatId: deps.chatId })();
            const admin = data.sessionFindOne.user?.admin;
            if (!admin) return { kind: 'unauthorized' };
            return { kind: 'detail', chat: admin.adminPublicChatFindOne };
        }
        const data = await routeLoaderGraphqlClient(WorkspaceVisitorChatsDocument)();
        const admin = data.sessionFindOne.user?.admin;
        if (!admin) return { kind: 'unauthorized' };
        return { kind: 'list', chats: admin.adminPublicChatFindMany };
    },
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
        const data = Route.useLoaderData();
        const locale = useLocale();
        if (data.kind === 'unauthorized') return <WorkspaceUnauthorized locale={locale} />;
        return (
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full pb-16">
                {data.kind === 'detail' ? (
                    <VisitorChatDetail chat={data.chat} locale={locale} />
                ) : (
                    <VisitorChatsList chats={data.chats} locale={locale} />
                )}
            </main>
        );
    },
});

function VisitorChatsList({ chats, locale }: { chats: VisitorChatsAdmin['adminPublicChatFindMany']; locale: Locale }) {
    return (
        <section className="py-10">
            <p className="max-w-2xl text-base text-muted-foreground">{description[locale]}</p>

            {chats.length === 0 ? (
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

function VisitorChatDetail({ chat, locale }: { chat: VisitorChatAdmin['adminPublicChatFindOne'] | null; locale: Locale }) {
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

            {chat ? (
                <>
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">{chat.title.trim() || untitled[locale]}</h1>
                    <GlassCard className="mt-6 px-4 py-6">
                        <ReadOnlyTranscript chat={chat} locale={locale} />
                    </GlassCard>
                </>
            ) : (
                <p className="mt-8 text-sm text-muted-foreground">{{ de: 'Chat nicht gefunden.', en: 'Chat not found.' }[locale]}</p>
            )}
        </section>
    );
}

// Read-only transcript renderer. Uses the same `ChatMessage` component the
// live surfaces use, but never passes `onCollectionSubmit` / `onApprovalRespond`
// so collection forms and approval requests render as static records. There
// are no `appendedMessages` or `streamingTexts` — this view is a snapshot of
// what's already persisted.
function ReadOnlyTranscript({ chat, locale }: { chat: NonNullable<VisitorChatAdmin['adminPublicChatFindOne']>; locale: Locale }) {
    const allMessages = mergeTranscriptMessages(chat.messages, [] as ReadonlyArray<TranscriptMessage>);
    const groupedMessages = groupMessagesByDate(allMessages);
    return (
        <div className="flex min-w-0 flex-col gap-6">
            {groupedMessages.map((group) => (
                <section key={group.date} className="flex min-w-0 flex-col gap-4">
                    <DateSeparator iso={group.date} locale={locale} />
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

function DateSeparator({ iso, locale }: { iso: string; locale: Locale }) {
    return (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <time dateTime={iso}>{formatDate(iso, { locale })}</time>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}
