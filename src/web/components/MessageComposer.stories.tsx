import type { Meta, StoryObj } from '@storybook/react-vite';
import { BotIcon, ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { MessageComposer } from './MessageComposer';
import type { ComposerAttachment } from './MessageComposer';

// `MessageComposer` is fully controlled — the parent owns `value`, `busy`,
// `disabled`, and `attachments`. A small in-story harness wraps it so the
// stories can demonstrate real interaction (typing, sending, attachment
// uploads) instead of just freezing the surface at one point in its
// lifecycle. Stories that want to pin a static state (e.g. "busy" or
// "drag-over") override the harness's behavior with explicit `args`.

const meta = {
    title: 'Composer/MessageComposer',
    component: MessageComposer,
    parameters: {
        // The composer sits inside dialogs / sheets / hero blocks elsewhere —
        // give it the same generous width here so the layout reads right.
        layout: 'centered',
    },
    args: {
        value: '',
        onValueChange: () => {},
        onSubmit: () => {},
        placeholder: 'Ask me anything…',
    },
    decorators: [
        (Story) => (
            <div className="w-[640px] max-w-[90vw]">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
    // Discriminated attachment props make CSF `args` resolve to `never` under
    // `satisfies Meta<typeof MessageComposer>` — cast keeps stories writable.
} as Meta<typeof MessageComposer>;

export default meta;
type Story = StoryObj<typeof MessageComposer>;

// ─── Static states ─────────────────────────────────────────────────────────

export const Default: Story = {};

export const DraftReady: Story = {
    name: 'Draft ready (Send button lifted)',
    args: {
        value: 'Book me a table for two on Friday at 7pm in Berlin.',
    },
};

export const Busy: Story = {
    name: 'Busy (spinner in Send slot, inputs locked)',
    args: {
        value: 'Book me a table for two on Friday at 7pm in Berlin.',
        busy: true,
    },
};

export const Disabled: Story = {
    name: 'Disabled (parent-level lock)',
    args: {
        value: 'You cannot send this right now.',
        disabled: true,
    },
};

export const Empty: Story = {
    name: 'Empty (Send muted, disabled)',
    args: {
        value: '',
        placeholder: 'Ask me anything…',
    },
};

export const LongDraft: Story = {
    name: 'Long draft (textarea grows up to max-h)',
    args: {
        value: Array(8)
            .fill(
                'This is a long draft to demonstrate how the textarea grows with its content. The field-sizing-content trick lets the box expand line by line without the parent reflowing.',
            )
            .join('\n\n'),
    },
};

// ─── Locale variants ──────────────────────────────────────────────────────

export const German: Story = {
    name: 'DE — Senden tooltip + aria-label',
    args: { placeholder: 'Frag mich alles…' },
    parameters: {
        reactRouter: { initialEntries: ['/de'] },
    },
};

export const English: Story = {
    name: 'EN — Send tooltip + aria-label',
    args: { placeholder: 'Ask me anything…' },
};

// ─── addonStart slot ──────────────────────────────────────────────────────

// Mirrors what the workspace surface plugs in: a model selector and an
// approval-mode toggle, both sitting in the bottom-left addon next to Send.
export const WithAddonStart: Story = {
    name: 'addonStart — model + approval-mode selectors',
    args: {
        addonStart: (
            <>
                <Select defaultValue="gemini-pro">
                    <SelectTrigger size="sm" className="h-7 gap-1.5 px-2 text-xs">
                        <BotIcon className="size-3.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        <SelectItem value="gemini-flash">Gemini Flash</SelectItem>
                    </SelectContent>
                </Select>
                <Select defaultValue="auto">
                    <SelectTrigger size="sm" className="h-7 gap-1.5 px-2 text-xs">
                        <ShieldCheckIcon className="size-3.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">Auto-approve</SelectItem>
                        <SelectItem value="require">Require approval</SelectItem>
                    </SelectContent>
                </Select>
            </>
        ),
    },
};

// ─── Attachments matrix ───────────────────────────────────────────────────

// Tiny 1×1 transparent PNG used to back the synthetic File objects without
// reaching the network. Files in stories need to be `File` instances because
// the composer reads `file.name` / `file.type` / `file.size`.
const PIXEL_BYTES = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
    (c) => c.charCodeAt(0),
);

function makeFile(name: string, type: string, size = PIXEL_BYTES.byteLength): File {
    // `new File()` lets us synthesize a real File instance with controllable
    // name/type so the preview tile picks the right branch (image vs icon).
    const file = new File([PIXEL_BYTES], name, { type });
    // The composer doesn't read `file.size` itself, but the surrounding chat
    // wrappers do; keep the value honest so future stories can reuse these.
    Object.defineProperty(file, 'size', { value: size });
    return file;
}

const attachmentsAllStates: ComposerAttachment[] = [
    { localId: 'a-uploading', file: makeFile('uploading-shot.png', 'image/png'), status: 'uploading' },
    { localId: 'a-uploaded-img', file: makeFile('hero.png', 'image/png'), status: 'uploaded', fileUploadId: 'fu-1' },
    { localId: 'a-uploaded-doc', file: makeFile('contract.pdf', 'application/pdf', 120_000), status: 'uploaded', fileUploadId: 'fu-2' },
    { localId: 'a-error', file: makeFile('too-big.zip', 'application/zip', 50_000_000), status: 'error', error: 'File exceeds 25 MB' },
];

export const AttachmentsAllStates: Story = {
    name: 'Attachments — uploading / uploaded / error',
    args: {
        attachments: attachmentsAllStates,
        attachmentsTitle: 'Attach files',
        onAttachmentsAdd: () => {},
        onAttachmentRemove: () => {},
    },
};

export const AttachmentImageOnly: Story = {
    name: 'Attachment — image preview',
    args: {
        attachments: [{ localId: 'a-img', file: makeFile('photo.png', 'image/png'), status: 'uploaded', fileUploadId: 'fu-img' }],
        attachmentsTitle: 'Attach files',
        onAttachmentsAdd: () => {},
        onAttachmentRemove: () => {},
    },
};

export const AttachmentNonImageOnly: Story = {
    name: 'Attachment — non-image fallback (file icon + name)',
    args: {
        attachments: [
            {
                localId: 'a-doc',
                file: makeFile('annual-report-2025.pdf', 'application/pdf', 320_000),
                status: 'uploaded',
                fileUploadId: 'fu-doc',
            },
        ],
        attachmentsTitle: 'Attach files',
        onAttachmentsAdd: () => {},
        onAttachmentRemove: () => {},
    },
};

export const AttachmentsMany: Story = {
    name: 'Attachments — wrap behavior with many tiles',
    args: {
        attachments: Array.from({ length: 8 }, (_, index) => ({
            localId: `a-${index}`,
            file: makeFile(`file-${index + 1}.png`, 'image/png'),
            status: 'uploaded' as const,
            fileUploadId: `fu-${index}`,
        })),
        attachmentsTitle: 'Attach files',
        onAttachmentsAdd: () => {},
        onAttachmentRemove: () => {},
    },
};

export const SingleAttachmentMode: Story = {
    name: 'multipleAttachments=false — picker capped to one',
    args: {
        multipleAttachments: false,
        attachmentsTitle: 'Attach one image',
        accept: 'image/*',
        attachments: [],
        onAttachmentsAdd: () => {},
        onAttachmentRemove: () => {},
    },
};

// ─── Interactive harness ──────────────────────────────────────────────────

// A small wrapper that owns draft + attachments + busy state so the stories
// behave the way the real surfaces behave. Click Send → spinner for ~900ms
// → check flash → back to idle.
function InteractiveComposer({ withAttachments = false }: { withAttachments?: boolean }) {
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

    const onSubmit = () => {
        setBusy(true);
        window.setTimeout(() => {
            setBusy(false);
            setValue('');
            setAttachments([]);
        }, 900);
    };

    if (withAttachments) {
        return (
            <MessageComposer
                value={value}
                onValueChange={setValue}
                onSubmit={onSubmit}
                busy={busy}
                placeholder="Type and press Enter — or attach a file"
                attachments={attachments}
                attachmentsTitle="Attach files"
                onAttachmentsAdd={(files) => {
                    // Fake an upload that resolves after ~600ms.
                    const created: ComposerAttachment[] = files.map((file) => ({
                        localId: crypto.randomUUID(),
                        file,
                        status: 'uploading' as const,
                    }));
                    setAttachments((current) => [...current, ...created]);
                    for (const attachment of created) {
                        window.setTimeout(() => {
                            setAttachments((current) =>
                                current.map((existing) =>
                                    existing.localId === attachment.localId
                                        ? { ...existing, status: 'uploaded', fileUploadId: `fu-${attachment.localId}` }
                                        : existing,
                                ),
                            );
                        }, 600);
                    }
                }}
                onAttachmentRemove={(localId) => setAttachments((current) => current.filter((a) => a.localId !== localId))}
            />
        );
    }

    return (
        <MessageComposer
            value={value}
            onValueChange={setValue}
            onSubmit={onSubmit}
            busy={busy}
            placeholder="Type and press Enter — or attach a file"
        />
    );
}

export const Interactive: Story = {
    name: 'Interactive — type, send, watch the check flash',
    render: () => <InteractiveComposer />,
};

export const InteractiveWithAttachments: Story = {
    name: 'Interactive — drag a file in, then send',
    render: () => <InteractiveComposer withAttachments />,
};

export const AutoFocus: Story = {
    name: 'autoFocus — composer claims focus on mount',
    args: { autoFocus: true },
};
