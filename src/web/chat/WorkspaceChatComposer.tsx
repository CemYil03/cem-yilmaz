import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChatComposer } from './ChatComposer';
import { useWorkspaceAssistantChat } from './WorkspaceAssistantChatProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/base/select';
import { WorkspaceChatMessageCreateDocument } from '../graphql/generated';
import type { Locale } from '../utils/locale';

// Admin-namespace composer used on every workspace surface that lets the
// user send a message — the hub composer on `/workspace`, the sheet
// composer mounted at the workspace layout, and the empty/loaded
// composer on `/workspace/assistant`. It is a thin wrapper around
// `<ChatComposer />` that:
//
// - dispatches the workspace `chatMessageCreate` mutation (so the server
//   routes to `agentPersonalAssistant` — see
//   `docs/architecture/multi-agent-chat.md`);
// - pulls the model catalog + selected model id from the workspace
//   assistant chat provider, so the same dropdown choice is reflected on
//   every surface and a change is persisted as the new sticky default
//   (see `docs/features/admin-chat-config.md`);
// - renders the model dropdown and the tool-call approval-mode selector
//   into the bottom-left addon slot — these are admin-only controls, so
//   they live in this wrapper rather than the audience-agnostic base;
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

interface WorkspaceChatComposerProps {
    locale: Locale;
    /** Optional — undefined means "first send creates a new chat". */
    chatId?: string;
    /** Use the caller's `useChatLiveUpdates` handle (route composers) or
     *  the provider's (hub/sheet). Both expose the same shape. */
    isLocked: boolean;
    beginTurn: () => string;
    endTurn: () => void;
    /** Forwarded to `ChatComposer` — fired with the chatId returned by
     *  the mutation. */
    onMessageSent?: (chatId: string) => void;
    /** Focus the textarea on mount. */
    autoFocus?: boolean;
    /** Surface-specific addon prepended to the model + approval-mode
     *  selectors — e.g. the sheet's "new chat" button. */
    addonStart?: ReactNode;
}

const placeholderCopy = { de: 'Frag deinen Assistenten…', en: 'Ask your assistant…' };
const modelLabel = { de: 'Modell', en: 'Model' };

const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

export function WorkspaceChatComposer({
    locale,
    chatId,
    isLocked,
    beginTurn,
    endTurn,
    onMessageSent,
    autoFocus = false,
    addonStart,
}: WorkspaceChatComposerProps) {
    const { chatConfig, selectedModelId, onModelChange } = useWorkspaceAssistantChat();
    const [mode, setMode] = useState<ToolCallApprovalMode>('auto');
    return (
        <ChatComposer
            locale={locale}
            chatId={chatId}
            isLocked={isLocked}
            beginTurn={beginTurn}
            endTurn={endTurn}
            sendMutation={WorkspaceChatMessageCreateDocument}
            extractResult={extractMessageCreateResult}
            placeholder={placeholderCopy[locale]}
            availableModels={chatConfig.availableModels}
            modelId={selectedModelId}
            requireToolCallApprovals={mode === 'manual'}
            onMessageSent={onMessageSent}
            autoFocus={autoFocus}
            addonStart={
                <>
                    {addonStart}
                    <Select value={selectedModelId} onValueChange={onModelChange} disabled={isLocked}>
                        <SelectTrigger size="sm" aria-label={modelLabel[locale]} className="h-7 gap-1 px-2 text-xs">
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
                        <SelectTrigger size="sm" aria-label="Tool call approval mode" className="h-7 gap-1 px-2 text-xs">
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
