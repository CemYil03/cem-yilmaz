import { format, parseISO } from 'date-fns';
import {
    AlertTriangleIcon,
    BracesIcon,
    CheckIcon,
    ChevronDownIcon,
    CopyIcon,
    Loader2Icon,
    PauseIcon,
    PlayIcon,
    SquareIcon,
    Volume2Icon,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { languageTagFromLocale } from '../../../shared';
import { toolDisplay } from '../../chat/toolDisplay';
import { interpretToolResult } from '../../chat/toolResult';
import type { ToolStatus } from '../../chat/toolResult';
import { useLocale } from '../../hooks/useLocale';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { cn } from '../../utils/cn';
import { markdownToPlainText } from '../../utils/markdownToPlainText';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../base/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../base/tooltip';

// Bits shared across the chat-message variants. Kept variant-agnostic — anything
// specific to a single message type lives next to that variant's view file.

// `system` rows (tool calls, approval request/response) sit on the left rail —
// the same side as the assistant — so they read as the assistant's own actions
// rather than centred "system announcements". `user` rows push right; `center`
// is for rows that belong to neither side (e.g. a project's internal activity
// markers). See docs/styles/chat.md ("Message rendering").
export function MessageRow({ side, children }: { side: 'user' | 'assistant' | 'system' | 'center'; children: React.ReactNode }) {
    return (
        <div
            data-slot="chat-message-row"
            data-side={side}
            className={cn(
                'flex w-full gap-3',
                side === 'user' && 'justify-end',
                side === 'system' && 'justify-start',
                side === 'center' && 'justify-center',
            )}
        >
            {children}
        </div>
    );
}

// `user` is the right-aligned brand bubble; `assistant` the left-aligned muted
// one. `neutral` is an opaque muted bubble that stays readable over a tinted
// backdrop (the assistant tone's translucency washes out on the workspace's
// ambient orb); `outgoing` is a primary-tinted bubble for "from me" rows on
// non-chat surfaces. `className` lets a caller round a specific corner or nudge
// spacing without forking the component.
export function Bubble({
    tone,
    className,
    children,
}: {
    tone: 'user' | 'assistant' | 'neutral' | 'outgoing';
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            data-slot="chat-message-bubble"
            data-tone={tone}
            className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm',
                tone === 'user' && 'rounded-br-sm bg-brand text-brand-foreground',
                tone === 'assistant' && 'rounded-bl-sm bg-muted text-foreground',
                tone === 'neutral' && 'rounded-bl-sm border border-border/60 bg-muted text-foreground',
                tone === 'outgoing' && 'rounded-br-sm border border-primary/20 bg-primary/15 text-foreground',
                className,
            )}
        >
            {children}
        </div>
    );
}

// Small status glyph for a tool row: spinner while a call is in flight, a muted
// check once it lands, an alert triangle on a failed result. Kept next to the
// tool's own domain icon so the row's identity (which tool) doesn't flicker as
// the status resolves. Shared by the top-level pill and the child rows.
export function ToolStatusIcon({ status, className }: { status: ToolStatus; className?: string }) {
    if (status === 'inProgress') return <Loader2Icon aria-hidden className={cn('animate-spin', className)} />;
    if (status === 'failed') return <AlertTriangleIcon aria-hidden className={cn('text-destructive', className)} />;
    return <CheckIcon aria-hidden className={cn('opacity-70', className)} />;
}

// Left-aligned pill for a single tool call. Shared by the top-level tool-call
// row and any surface that needs to show "the assistant used a tool". While the
// turn is still in flight (`active`), the label carries the `shimmer` sweep —
// the same live "working on it" signal `AssistantMarkdown` uses for its
// Thinking… placeholder, not a decorative loop (see docs/styles/motion.md).
// Once the turn settles, the shimmer is dropped and the row reads as a record.
//
// When the tool returned a `{ status, summary }` result, the pill grows a
// status glyph and an expandable one-line summary beneath it; the full raw
// result stays in the args inspector's Result section. See docs/styles/chat.md.
export function ToolRowShell({
    toolName,
    args,
    result,
    createdAt,
    active = false,
}: {
    toolName: string;
    args: unknown;
    result?: unknown;
    createdAt: string;
    active?: boolean;
}) {
    const locale = useLocale();
    const { Icon, label } = toolDisplay(toolName);
    const { status, summary } = interpretToolResult(result, active);
    const text = active ? { de: `${label.de}…`, en: `${label.en}…` }[locale] : label[locale];
    return (
        <div data-slot="chat-message-tool-call-shell" className="flex max-w-full flex-col items-start gap-1">
            <div
                data-slot="chat-message-tool-call-pill"
                data-active={active}
                data-status={status}
                className="group/tool-row inline-flex max-w-full items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground"
            >
                <Icon aria-hidden className="size-3.5 shrink-0" />
                <span className={cn('truncate', active && 'shimmer')}>{text}</span>
                <ToolStatusIcon status={status} className="size-3.5 shrink-0" />
                <ToolArgumentsButton toolName={toolName} args={args} result={result} />
                <Timestamp iso={createdAt} className="mt-0" />
            </div>
            {summary ? <ToolResultSummary summary={summary} failed={status === 'failed'} /> : null}
        </div>
    );
}

// Collapsed one-line summary under a tool pill with a click-to-expand
// disclosure. No base `Collapsible` primitive exists, so this is a local toggle
// with `aria-expanded`; the height change is a plain clamp swap (no motion, so
// it's reduced-motion-safe by construction).
function ToolResultSummary({ summary, failed }: { summary: string; failed: boolean }) {
    const locale = useLocale();
    const [expanded, setExpanded] = React.useState(false);
    const label = expanded ? { de: 'Weniger anzeigen', en: 'Show less' }[locale] : { de: 'Mehr anzeigen', en: 'Show more' }[locale];
    return (
        <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={label}
            className={cn(
                'group/summary ml-1 flex max-w-full items-start gap-1 rounded text-left text-xs',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                failed ? 'text-destructive/90' : 'text-muted-foreground',
            )}
        >
            <ChevronDownIcon
                aria-hidden
                className={cn('mt-0.5 size-3 shrink-0 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')}
            />
            <span className={cn('min-w-0 whitespace-pre-wrap wrap-break-word', !expanded && 'line-clamp-1')}>{summary}</span>
        </button>
    );
}

export function Timestamp({ iso, className }: { iso: string; className?: string }) {
    return (
        <time dateTime={iso} className={cn('mt-1 block text-[11px] opacity-70', className)}>
            {format(parseISO(iso), 'HH:mm')}
        </time>
    );
}

// Inline copy affordance under assistant messages. The icon swap is local
// transient feedback; the sonner toast (rendered by `<Toaster />` in the root
// layout) is the durable confirmation, including on clipboard failure.
export function CopyButton({ text }: { text: string }) {
    const locale = useLocale();
    const [copied, setCopied] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const label = copied ? { de: 'Kopiert', en: 'Copied' }[locale] : { de: 'Nachricht kopieren', en: 'Copy message' }[locale];
    React.useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);
    const onCopy = React.useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }[locale]);
        } catch {
            // Surface the failure as an error toast — the icon swap below
            // still fires so the click never feels swallowed, but the user
            // gets a clear signal that nothing actually landed on the clipboard.
            toast.error({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }[locale]);
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={label}
                    onClick={onCopy}
                    className="opacity-70 hover:opacity-100"
                >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

// Inline read-aloud affordance under assistant messages. Calls `/api/tts`
// (Gemini TTS) so the audio quality is neural regardless of browser/OS.
//
// Renders a small transport:
//   - idle:    [▶]                — click starts playback
//   - loading: [⏳]                — click cancels the pending request
//   - playing: [⏸]  [■]           — pause without losing position; stop resets
//   - paused:  [▶]  [■]           — resume from position; stop resets
//
// `speak()` hard-stops any prior playback (in this or any other button)
// before starting, so two messages can never overlap across the app.
//
// Hover / focus pre-warms the request: the fetch starts as soon as the
// pointer or keyboard focus lands on the primary button, so by the time
// the user actually clicks, either the server cache has already returned
// the audio or the streaming synthesis is well underway. The hook
// de-dupes on `text`, so hovering the same button twice costs nothing
// extra; pre-warm stays on regardless of the current state because the
// cache absorbs the cost.
export function SpeakButton({ text }: { text: string }) {
    const locale = useLocale();
    const { state, speak, pause, resume, stop, preload } = useSpeechSynthesis();
    const spokenText = React.useMemo(() => markdownToPlainText(text, locale), [text, locale]);
    const onPrefetch = () => preload(spokenText);
    const onPrimaryClick = async () => {
        if (state === 'loading') {
            stop();
            return;
        }
        if (state === 'playing') {
            pause();
            return;
        }
        if (state === 'paused') {
            resume();
            return;
        }
        try {
            await speak(spokenText, languageTagFromLocale(locale));
        } catch {
            toast.error({ de: 'Vorlesen fehlgeschlagen', en: 'Read-aloud failed' }[locale]);
        }
    };
    const primaryIcon =
        state === 'loading' ? (
            <Loader2Icon aria-hidden className="animate-spin" />
        ) : state === 'playing' ? (
            <PauseIcon aria-hidden />
        ) : state === 'paused' ? (
            <PlayIcon aria-hidden />
        ) : (
            <Volume2Icon aria-hidden />
        );
    const primaryLabel =
        state === 'loading'
            ? { de: 'Vorlesen abbrechen', en: 'Cancel' }[locale]
            : state === 'playing'
              ? { de: 'Pausieren', en: 'Pause' }[locale]
              : state === 'paused'
                ? { de: 'Fortsetzen', en: 'Resume' }[locale]
                : { de: 'Nachricht vorlesen', en: 'Read message aloud' }[locale];
    const showStop = state === 'playing' || state === 'paused';
    const stopLabel = { de: 'Vorlesen stoppen', en: 'Stop reading' }[locale];
    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={primaryLabel}
                        aria-pressed={state !== 'idle'}
                        onClick={onPrimaryClick}
                        onMouseEnter={onPrefetch}
                        onFocus={onPrefetch}
                        className="opacity-70 hover:opacity-100"
                    >
                        {primaryIcon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{primaryLabel}</TooltipContent>
            </Tooltip>
            {showStop && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={stopLabel}
                            onClick={stop}
                            className="opacity-70 hover:opacity-100"
                        >
                            <SquareIcon aria-hidden />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{stopLabel}</TooltipContent>
                </Tooltip>
            )}
        </>
    );
}

// Small affordance shown next to a tool name. Hidden by default behind an
// icon-only button; clicking opens a dialog with the call's arguments — and,
// when present, its result — pretty-printed. Both come over the wire as the
// GraphQL `JSON` scalar (typed `unknown` client-side), so we serialize
// defensively. The inline summary under the pill is the headline; this dialog
// is the full payload.
export function ToolArgumentsButton({ toolName, args, result }: { toolName: string; args: unknown; result?: unknown }) {
    const locale = useLocale();
    const formattedArgs = React.useMemo(() => formatToolJson(args), [args]);
    const hasResult = result !== null && result !== undefined;
    const formattedResult = React.useMemo(() => (hasResult ? formatToolJson(result) : ''), [result, hasResult]);
    const openLabel = { de: 'Details anzeigen', en: 'Show details' }[locale];
    const argsLabel = { de: 'Argumente', en: 'Arguments' }[locale];
    const resultLabel = { de: 'Ergebnis', en: 'Result' }[locale];
    return (
        <Dialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={openLabel}
                            className="opacity-70 transition-opacity hover:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover/tool-row:opacity-70 pointer-fine:group-hover/tool-row:hover:opacity-100 pointer-fine:focus-visible:opacity-100"
                        >
                            <BracesIcon aria-hidden />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>{openLabel}</TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm">
                        <BracesIcon aria-hidden />
                        <code className="font-mono">{toolName}</code>
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Argumente und Ergebnis dieses Tool-Aufrufs.',
                                en: 'The arguments and result for this tool call.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <section className="grid gap-1.5">
                        <h3 className="text-xs font-medium text-muted-foreground">{argsLabel}</h3>
                        <pre className="max-h-[40vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">
                            {formattedArgs}
                        </pre>
                    </section>
                    {hasResult ? (
                        <section className="grid gap-1.5">
                            <h3 className="text-xs font-medium text-muted-foreground">{resultLabel}</h3>
                            <pre className="max-h-[40vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">
                                {formattedResult}
                            </pre>
                        </section>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// `JSON.stringify` throws on cycles and silently drops `undefined` / functions.
// Tool payloads coming from the LLM are plain JSON in practice, but the column
// is `unknown` so we still guard — a malformed payload should render as a human
// note, not crash the dialog.
function formatToolJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '// Could not format as JSON.';
    }
}
