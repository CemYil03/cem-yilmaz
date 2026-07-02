import type { Locale } from './locale';

// Strip markdown to plain text for TTS input. The assistant message body is
// authored as markdown (rendered on-screen via `AssistantMarkdown` /
// `streamdown`); feeding that raw string to `SpeechSynthesisUtterance` would
// have the browser voice literally say "hash hash Introduction" or spell out
// backticks. `streamdown` doesn't expose an AST stripper, so we do the small
// amount of regex work here directly — the input is human-language markdown,
// not arbitrary HTML, so a deterministic pass is enough.

const CODE_BLOCK_LABEL: Record<Locale, string> = {
    de: 'Codeblock',
    en: 'code block',
};

export function markdownToPlainText(markdown: string, locale: Locale): string {
    let text = markdown;

    // Fenced code blocks — replace with a spoken placeholder so the voice
    // acknowledges the block instead of trying to read it.
    text = text.replace(/```[\s\S]*?```/g, ` ${CODE_BLOCK_LABEL[locale]}. `);

    // Inline code — drop the backticks, keep the token so short things like
    // `foo` still read naturally.
    text = text.replace(/`([^`]+)`/g, '$1');

    // Images `![alt](url)` — keep the alt text if present.
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

    // Links `[label](url)` — keep the label.
    text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

    // Reference-style link definitions `[id]: url` — drop the whole line.
    text = text.replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '');

    // Headings — strip leading `#` markers.
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Block quotes — strip leading `>` markers.
    text = text.replace(/^\s*>\s?/gm, '');

    // List markers (`-`, `*`, `+`, or `1.`) at line start.
    text = text.replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '');

    // Emphasis / bold — bold (`**` / `__`) before italic (`*` / `_`) so the
    // outer pair strips first.
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');

    // Horizontal rules.
    text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, '');

    // Collapse runs of whitespace / blank lines into single spaces so the
    // synthesizer's default prosody handles pacing.
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}
