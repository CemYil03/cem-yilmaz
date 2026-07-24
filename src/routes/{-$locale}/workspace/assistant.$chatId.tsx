import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { useMutation } from 'urql';
import { toFlatAnswerInput } from '../../../web/chat/chatAssistantInputKinds';
import { mergeTranscriptMessages } from '../../../web/chat/chatTranscript';
import { ChatTranscript } from '../../../web/chat/ChatTranscriptShared';
import { DocumentPanelProvider } from '../../../web/chat/DocumentPanelProvider';
import { useChatLiveUpdates } from '../../../web/chat/useChatLiveUpdates';
import { useWorkspaceAssistantChat } from '../../../web/chat/WorkspaceAssistantChatProvider';
import { WorkspaceChatComposer } from '../../../web/chat/WorkspaceChatComposer';
import { ExternalLinkConfirmationProvider } from '../../../web/components/AssistantMarkdown';
import { Button } from '../../../web/components/base/button';
import type { GqlCChatAssistantInputValue, GqlCWorkspaceChatPageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceChatInputCollectionRespondDocument,
    WorkspaceChatPageDocument,
    WorkspaceChatToolApprovalRespondDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';
import type { Locale } from '../../../web/utils/locale';

// Deep-link surface for a single admin chat — `/workspace/assistant/<chatId>`.
// The previous `/workspace/assistant` landing page is gone: `/workspace`
// already fills the "how do I start a conversation" role via its hero
// composer, and the sidebar covers "how do I resume one" via its chat
// browser. This route exists so a specific chat has a URL you can
// bookmark or paste (e.g. the assistant asking the user to review a
// long-running turn, deep links from search results, etc.).
//
// Rendered surface: the chat's title on top, the transcript centered on
// `max-w-3xl`, and the shared `<WorkspaceChatComposer />` parked at the
// viewport bottom. No chat-list chrome — the sidebar is that. The
// transcript itself is the shared `<ChatTranscript />` — same component
// the sidebar body and the visitor sheet use.

export const Route = createFileRoute('/{-$locale}/workspace/assistant/$chatId')({
    loader: ({ params }) => routeLoaderGraphqlClient(WorkspaceChatPageDocument, { chatId: params.chatId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Persönlicher Assistent', en: 'Personal assistant' }[locale],
            description: {
                de: 'Mein persönlicher KI-Assistent für den Arbeitsbereich.',
                en: 'My personal AI assistant for the workspace.',
            }[locale],
            // The chatId is intentionally omitted from the canonical path —
            // per-chat URLs are private deep links, not indexable pages.
            path: '/workspace/assistant',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const data = Route.useLoaderData();
        const chat = data.sessionFindOne.user?.admin?.adminChatFindOne ?? null;
        const live = useChatLiveUpdates();
        const locale = useLocale();
        if (!chat) return <NotFound locale={locale} />;
        return (
            <>
                {live.listeners}
                <WorkspaceAssistantPage chat={chat} live={live} locale={locale} />
            </>
        );
    },
});

type AssistantChat = NonNullable<NonNullable<GqlCWorkspaceChatPageQuery['sessionFindOne']['user']>['admin']>['adminChatFindOne'];

function NotFound({ locale }: { locale: Locale }) {
    // Landing on `/workspace/assistant/<invalid>` is rare — deep links get
    // stale, the admin might have deleted the chat, etc. Instead of
    // erroring out, gesture the user back to a working surface: the
    // workspace hub is where a fresh chat starts.
    return (
        <main className="mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">{{ de: 'Chat nicht gefunden.', en: 'Chat not found.' }[locale]}</p>
            <Button asChild variant="outline" size="sm">
                <Link to="/{-$locale}/workspace">{{ de: 'Zurück zum Workspace', en: 'Back to workspace' }[locale]}</Link>
            </Button>
        </main>
    );
}

function WorkspaceAssistantPage({
    chat,
    live,
    locale,
}: {
    chat: NonNullable<AssistantChat>;
    live: ReturnType<typeof useChatLiveUpdates>;
    locale: Locale;
}) {
    const [, respondToCollection] = useMutation(WorkspaceChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(WorkspaceChatToolApprovalRespondDocument);
    const { pathname } = useLocation();
    // Sticky model selection is owned by the workspace provider so every
    // surface reflects the same choice.
    const { selectedModelId } = useWorkspaceAssistantChat();

    const onCollectionSubmit = useCallback(
        async (collectionMessageId: string, answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>) => {
            const generationId = live.beginTurn(chat.chatId);
            const flatAnswers = answers.map((answer) => toFlatAnswerInput(answer.inputId, answer.value));
            const result = await respondToCollection({
                collectionMessageId,
                answers: flatAnswers,
                generationId,
                requireToolCallApprovals: false,
                modelId: selectedModelId,
            });
            if (result.error) live.endTurn(generationId);
        },
        [respondToCollection, live, selectedModelId, chat.chatId],
    );

    const onApprovalRespond = useCallback(
        async (approvalId: string, approved: boolean, reason?: string) => {
            const generationId = live.beginTurn(chat.chatId);
            const result = await respondToApproval({
                approvalId,
                approved,
                reason,
                generationId,
                requireToolCallApprovals: true,
                modelId: selectedModelId,
            });
            if (result.error) live.endTurn(generationId);
        },
        [respondToApproval, live, selectedModelId, chat.chatId],
    );

    const messages = mergeTranscriptMessages(chat.messages, live.appendedMessagesFor(chat.chatId));

    // Clicking a document attachment opens the file in the assistant sidebar's
    // file-display state (owned by the provider). `openFile` also expands the
    // sidebar if it's collapsed. See `docs/features/workspace-files.md`.
    const { openFile } = useWorkspaceAssistantChat();
    const documentPanel = useMemo(() => ({ openDocument: openFile, canOpen: true }), [openFile]);

    // Standard chat layout — composer parks against the viewport bottom
    // and the transcript scrolls in between. The workspace layout wraps
    // the outlet in `flex min-h-screen flex-col`, so we give main a
    // definite height (`100dvh` minus the sticky header's flow rail of
    // ~5rem) and make the transcript wrapper the `flex-1 min-h-0` child.
    //
    // Reading width: `max-w-3xl` (~48rem) is the comfortable column for
    // long assistant markdown. Wider crowds the sidebar; narrower crops
    // code blocks.
    //
    // The chat title is not rendered here — the workspace header's
    // trailing breadcrumb already carries it (see
    // `WorkspaceHeader.tsx`'s `TRAILING_LABEL_SELECTORS`). And there's
    // no "New chat" affordance either: the "Workspace" crumb links to
    // the hub, whose hero composer is where a fresh chat starts.
    return (
        <main className="mx-auto flex h-[calc(100dvh-4rem)] w-full min-w-0 max-w-4xl flex-col gap-4 px-2 sm:pt-10 sm:pb-4">
            <div className="relative min-h-0 min-w-0 flex-1">
                {/* Workspace assistant links to the admin's own trusted
                 *  surfaces, so external-link confirmation is off here — see
                 *  `ExternalLinkConfirmationProvider` in `AssistantMarkdown.tsx`. */}
                <ExternalLinkConfirmationProvider enabled={false}>
                    <DocumentPanelProvider value={documentPanel}>
                        <ChatTranscript
                            messages={messages}
                            streamingTexts={live.streamingTextsFor(chat.chatId)}
                            reasoningTexts={live.reasoningTextsFor(chat.chatId)}
                            onCollectionSubmit={onCollectionSubmit}
                            onApprovalRespond={onApprovalRespond}
                            jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                            locale={locale}
                            isGenerating={live.isGenerating(chat.chatId)}
                            liveTurnMessageIds={live.liveTurnMessageIdsFor(chat.chatId)}
                        />
                    </DocumentPanelProvider>
                </ExternalLinkConfirmationProvider>
            </div>
            <WorkspaceChatComposer
                chatId={chat.chatId}
                isLocked={live.isGenerating(chat.chatId)}
                beginTurn={live.beginTurn}
                bindTurn={live.bindTurn}
                endTurn={live.endTurn}
                locale={locale}
                currentPagePath={pathname}
                messages={messages}
                contextTokensUsed={chat.contextTokensUsed}
                autoFocus
            />
        </main>
    );
}
