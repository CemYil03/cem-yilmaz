import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssistantMarkdown } from './AssistantMarkdown';

const meta = {
    title: 'Chat/AssistantMarkdown',
    component: AssistantMarkdown,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-2xl p-4">
                <Story />
            </div>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof AssistantMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Prose: Story = {
    args: {
        text: [
            "Hi! I'm Cem's portfolio assistant. Here's a quick rundown of what I can help with:",
            '',
            "I can answer questions about Cem's background, send him a project request, or point you at his GitHub. If you want a more conversational thread, the chat sheet on the right keeps history.",
            '',
            "If you'd like to reach him directly, his email is on the **About** page.",
        ].join('\n'),
    },
};

export const Lists: Story = {
    args: {
        text: [
            '### Bullet list',
            '- Software architecture & AI workflows',
            '- TypeScript / React / GraphQL across the stack',
            '- Comfortable in **DE** and **EN**',
            '',
            '### Numbered list',
            '1. Discovery — what are you actually trying to ship?',
            '2. Spike — smallest possible prototype that answers the question',
            '3. Build — iterate against real users',
            '',
            '### Nested',
            '- Top level',
            '  - Nested item one',
            '  - Nested item two',
            '    - Deeper still',
        ].join('\n'),
    },
};

export const CodeBlock: Story = {
    args: {
        text: [
            "Here's how `personalInfo.ts` exposes the contact email:",
            '',
            '```ts',
            'export const personalInfo = {',
            '  contact: {',
            '    emails: ["hello@cem-yilmaz.de"],',
            '    github: { url: "https://github.com/cem-yilmaz" },',
            '  },',
            '  publicVisibility: { emails: true, github: true, linkedin: true },',
            '} as const;',
            '```',
            '',
            'Inline code works too, e.g. `useLocale()` returns `Locale = "de" | "en"`.',
        ].join('\n'),
    },
};

export const Table: Story = {
    args: {
        text: [
            'A small comparison table — the renderer disables copy/download/fullscreen for tables so they stay quiet inside chat bubbles:',
            '',
            '| Phase | Status | Notes |',
            '| ----- | ------ | ----- |',
            '| Phase 1 — portfolio | ✅ Shipped | Landing, CV, projects, legal |',
            '| Phase 2 — OAuth + dual agents | 🚧 In progress | Workspace gating |',
            '| Phase 3 — DB-backed content | ⏳ Planned | Projects + tools + blog |',
        ].join('\n'),
    },
};

export const Math: Story = {
    args: {
        text: [
            'Inline math: $E = mc^2$.',
            '',
            'Display math:',
            '',
            '$$',
            '\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}', // cspell:disable-line
            '$$',
        ].join('\n'),
    },
};

export const LongLinks: Story = {
    args: {
        text: [
            'A long link that needs to wrap inside a chat bubble without overflowing:',
            '',
            '[Read the architecture notes on chat persistence](https://cem-yilmaz.de/en/docs/architecture/chat-persistence-and-real-time-state-synchronisation-deeply-nested-section)',
            '',
            'Plain URLs also wrap: https://cem-yilmaz.de/en/docs/architecture/chat-persistence-and-real-time-state-synchronisation',
        ].join('\n'),
    },
};

export const MixedDeEn: Story = {
    name: 'Mixed DE / EN — bilingual responses keep the same renderer',
    args: {
        text: [
            '**Auf Deutsch:** Cem ist Software-Architekt und KI-Engineer. Er liefert Web-Architektur und KI-Workflows für Unternehmen, die echte Produkte versenden müssen.',
            '',
            '**In English:** Cem is a software architect and AI engineer. He delivers web architecture and AI workflows for companies that ship.',
            '',
            '> Both languages share typography and spacing — no special styling per locale.',
        ].join('\n'),
    },
};

export const StreamingThinking: Story = {
    name: 'Streaming — empty text shows "Thinking…"',
    args: { text: '', streaming: true },
};

export const StreamingPartial: Story = {
    name: 'Streaming — partial markdown',
    parameters: {
        docs: {
            description: {
                story: '`parseIncompleteMarkdown` keeps a mid-stream code fence or table from breaking the layout when more tokens arrive. This story shows the end-of-stream-but-still-partial state.',
            },
        },
    },
    args: {
        text: ["Let me think about that — here's what I have so far:", '', '```ts', 'const status: "uploading" | "uploaded" |'].join('\n'),
        streaming: true,
    },
};
