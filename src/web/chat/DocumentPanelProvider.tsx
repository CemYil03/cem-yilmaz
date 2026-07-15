import { createContext, useContext } from 'react';

// The workspace document panel is the Claude-artifact-style half-screen editor
// that opens when Cem clicks a file attachment on an assistant message. Which
// chat surface he's on decides what "open" means, so the behaviour is injected
// via context (the same pattern as `ExternalLinkConfirmationProvider` in
// `AssistantMarkdown.tsx`) rather than threaded as a prop through the
// transcript:
//
//   - full-page chat (`/workspace/assistant/$chatId`) mounts a provider whose
//     `openDocument` opens the split-panel editor inline (via the `?doc` search
//     param, so the open state is URL-addressable).
//   - the docked sidebar / sheet mounts a provider whose `openDocument` first
//     confirms navigation to the full-page view, then opens the panel there.
//   - anywhere without a provider (e.g. the public visitor sheet — which never
//     has these tools anyway) the default no-op leaves the chip inert.
//
// `canOpen` lets the attachment render as plain (non-interactive) text where
// there's no handler, so it never looks clickable-but-dead.

export interface DocumentPanelContextValue {
    openDocument: (workspaceFileId: string) => void;
    canOpen: boolean;
}

const noop: DocumentPanelContextValue = {
    openDocument: () => {},
    canOpen: false,
};

const DocumentPanelContext = createContext<DocumentPanelContextValue>(noop);

export function DocumentPanelProvider({ value, children }: { value: DocumentPanelContextValue; children: React.ReactNode }) {
    return <DocumentPanelContext.Provider value={value}>{children}</DocumentPanelContext.Provider>;
}

export function useDocumentPanel(): DocumentPanelContextValue {
    return useContext(DocumentPanelContext);
}
