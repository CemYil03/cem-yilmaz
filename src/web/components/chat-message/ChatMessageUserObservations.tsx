import { useState } from 'react';
import { ChevronDownIcon, SparklesIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { GqlCChatMessageUser } from '../../graphql/generated';
import { cn } from '../../utils/cn';

// Inline pill rendered below admin user messages when the compass analyzer
// extracted observations from them. Click to expand and see the actual lines
// the analyzer recorded; "View on compass" deep-links to the dedicated page.
//
// Renders nothing when there are no observations (the common case for visitor
// chats, where the analyzer never runs). See `docs/features/compass.md`.

type Observation = GqlCChatMessageUser['compassObservations'][number];

const CATEGORY_LABELS: Record<Observation['category'], { de: string; en: string }> = {
    factual: { de: 'Faktisch', en: 'Factual' },
    behavioral: { de: 'Verhalten', en: 'Behavioral' },
    psychological: { de: 'Psychologisch', en: 'Psychological' },
};

const CATEGORY_DOT: Record<Observation['category'], string> = {
    factual: 'bg-sky-500',
    behavioral: 'bg-violet-500',
    psychological: 'bg-rose-500',
};

export function ChatMessageUserObservations({ observations, locale }: { observations: ReadonlyArray<Observation>; locale: 'de' | 'en' }) {
    const [open, setOpen] = useState(false);
    if (observations.length === 0) return null;

    const count = observations.length;
    const summary =
        count === 1
            ? { de: '1 Beobachtung aufgezeichnet', en: '1 observation recorded' }[locale]
            : { de: `${count} Beobachtungen aufgezeichnet`, en: `${count} observations recorded` }[locale];

    return (
        <div className="mt-1.5 flex flex-col items-end gap-1.5 max-w-[80%]">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors',
                )}
            >
                <SparklesIcon className="size-3 text-primary/70" />
                <span>{summary}</span>
                <ChevronDownIcon className={cn('size-3 transition-transform', open && 'rotate-180')} />
            </button>
            {open ? (
                <div className="w-full rounded-md border border-border/40 bg-background/60 backdrop-blur-sm px-3 py-2.5 text-xs text-foreground/90 shadow-sm">
                    <ul className="flex flex-col gap-2">
                        {observations.map((obs) => (
                            <li key={obs.observationId} className="flex items-start gap-2">
                                <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', CATEGORY_DOT[obs.category])} aria-hidden />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {CATEGORY_LABELS[obs.category][locale]}
                                    </div>
                                    <p className="mt-0.5 leading-snug">{obs.content}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 flex justify-end">
                        <Link
                            to="/{-$locale}/workspace/compass"
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {{ de: 'Kompass öffnen →', en: 'Open compass →' }[locale]}
                        </Link>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
