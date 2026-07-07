import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { BracesIcon, CheckIcon, CopyIcon, Loader2Icon, PauseIcon, PlayIcon, SquareIcon, Volume2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '../../hooks/useLocale';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { cn } from '../../utils/cn';
import { markdownToPlainText } from '../../utils/markdownToPlainText';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../base/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../base/tooltip';

// Bits shared across the chat-message variants. Kept variant-agnostic — anything
// specific to a single message type lives next to that variant's view file.

export function MessageRow({ side, children }: { side: 'user' | 'assistant' | 'system'; children: React.ReactNode }) {
    return (
        <div
            data-slot="chat-message-row"
            data-side={side}
            className={cn('flex w-full gap-3', side === 'user' && 'justify-end', side === 'system' && 'justify-center')}
        >
            {children}
        </div>
    );
}

export function Bubble({ tone, children }: { tone: 'user' | 'assistant'; children: React.ReactNode }) {
    return (
        <div
            data-slot="chat-message-bubble"
            data-tone={tone}
            className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm',
                tone === 'user' ? 'rounded-br-sm bg-brand text-brand-foreground' : 'rounded-bl-sm bg-muted text-foreground',
            )}
        >
            {children}
        </div>
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
        <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={copied ? { de: 'Kopiert', en: 'Copied' }[locale] : { de: 'Nachricht kopieren', en: 'Copy message' }[locale]}
            onClick={onCopy}
            className="opacity-70 hover:opacity-100"
        >
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </Button>
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
            await speak(spokenText, locale === 'de' ? 'de-DE' : 'en-US');
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
    return (
        <>
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
            {showStop && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={{ de: 'Vorlesen stoppen', en: 'Stop reading' }[locale]}
                    onClick={stop}
                    className="opacity-70 hover:opacity-100"
                >
                    <SquareIcon aria-hidden />
                </Button>
            )}
        </>
    );
}

// Small affordance shown next to a tool name. Hidden by default behind an
// icon-only button; clicking opens a dialog with the call's arguments
// pretty-printed. The args come over the wire as the GraphQL `JSON` scalar
// (typed `unknown` client-side), so we serialize defensively.
export function ToolArgumentsButton({ toolName, args }: { toolName: string; args: unknown }) {
    const formatted = React.useMemo(() => formatToolArguments(args), [args]);
    return (
        <Dialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Show arguments"
                            className="opacity-70 hover:opacity-100"
                        >
                            <BracesIcon aria-hidden />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Show arguments</TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm">
                        <BracesIcon aria-hidden />
                        Arguments for <code className="font-mono">{toolName}</code>
                    </DialogTitle>
                    <DialogDescription>The arguments the assistant supplied for this tool call.</DialogDescription>
                </DialogHeader>
                <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">
                    {formatted}
                </pre>
            </DialogContent>
        </Dialog>
    );
}

// `JSON.stringify` throws on cycles and silently drops `undefined` / functions.
// Tool args coming from the LLM are plain JSON in practice, but the column is
// `unknown` so we still guard — a malformed payload should render as a human
// note, not crash the dialog.
function formatToolArguments(args: unknown): string {
    try {
        return JSON.stringify(args, null, 2);
    } catch {
        return '// Could not format arguments as JSON.';
    }
}
