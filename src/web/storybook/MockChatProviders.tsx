import type { ReactNode } from 'react';
import { VisitorChatContext } from '../chat/VisitorChatProvider';
import { WorkspaceAssistantChatContext } from '../chat/WorkspaceAssistantChatProvider';

// Stub chat-context providers used exclusively by Storybook stories. They
// supply just enough of the real shapes that `HeaderChatButton` can render
// without throwing — the live updates / pubsub / mutation plumbing is
// replaced with no-ops. The visitor stub additionally tracks the highlight
// signal so a story like "header pulse on close" can be wired by clicking a
// helper button.
//
// Kept out of `chat/` because they exist only for stories — nothing in the
// production app should reach for these.

const noOpLive = {
    isGenerating: false,
    appendedMessages: [],
    streamingTexts: {},
    beginTurn: () => 'storybook-generation-id',
    endTurn: () => {},
    listener: null,
} as const;

export function MockVisitorChatProvider({ children, highlightSignal = 0 }: { children: ReactNode; highlightSignal?: number }) {
    return (
        <VisitorChatContext.Provider
            value={{
                isOpen: false,
                chatId: undefined,
                live: noOpLive,
                openEmpty: () => {},
                openWithMessage: async () => {},
                loadChat: () => {},
                setChatIdFromHero: () => {},
                resetChat: () => {},
                open: () => {},
                close: () => {},
                highlightSignal,
            }}
        >
            {children}
        </VisitorChatContext.Provider>
    );
}

export function MockWorkspaceAssistantChatProvider({ children }: { children: ReactNode }) {
    return (
        <WorkspaceAssistantChatContext.Provider
            value={{
                chatId: undefined,
                loadedMessages: [],
                live: noOpLive,
                setChatIdFromHub: () => {},
                resetChat: () => {},
                loadChat: async () => {},
                chatConfig: {
                    defaultModelId: 'gemini-pro',
                    availableModels: [
                        { modelId: 'gemini-pro', label: 'Gemini Pro', supportedMediaTypes: ['image/*', 'application/pdf'] },
                        { modelId: 'gemini-flash', label: 'Gemini Flash', supportedMediaTypes: ['image/*'] },
                    ],
                },
                selectedModelId: 'gemini-pro',
                onModelChange: () => {},
                openFileId: null,
                openFile: () => {},
                closeFile: () => {},
            }}
        >
            {children}
        </WorkspaceAssistantChatContext.Provider>
    );
}
