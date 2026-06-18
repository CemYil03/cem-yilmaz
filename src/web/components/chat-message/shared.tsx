import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { BracesIcon, CheckIcon, CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
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
                tone === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground',
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
            toast.success('Copied to clipboard');
        } catch {
            // Surface the failure as an error toast — the icon swap below
            // still fires so the click never feels swallowed, but the user
            // gets a clear signal that nothing actually landed on the clipboard.
            toast.error('Could not copy to clipboard');
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text]);
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={copied ? 'Copied' : 'Copy message'}
            onClick={onCopy}
            className="opacity-70 hover:opacity-100"
        >
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        </Button>
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
