import { XIcon } from 'lucide-react';
import * as React from 'react';
import { useState } from 'react';
import { cn } from '../utils/cn';

// Free-form multi-select rendered as pills. Enter (or comma) commits the
// current draft as a chip; Backspace on an empty draft pops the last chip.
// Optional suggestion chips underneath add known values in one click; ad-hoc
// strings are always allowed, so suggestions act as a hint, not a constraint.
//
// Shared by the media topics field and the nutrition ingredients/tags fields.
// `renderLabel` maps a stored value to its display text (e.g. a topic enum to
// its localized label); it defaults to the raw value.
export function ChipInput({
    value,
    onChange,
    placeholder,
    morePlaceholder,
    suggestions,
    renderLabel = (chip) => chip,
    removeLabel = 'Remove',
}: {
    value: ReadonlyArray<string>;
    onChange: (next: string[]) => void;
    placeholder: string;
    /** Placeholder once at least one chip exists. Defaults to `placeholder`. */
    morePlaceholder?: string;
    suggestions?: ReadonlyArray<string>;
    renderLabel?: (chip: string) => React.ReactNode;
    removeLabel?: string;
}) {
    const [draft, setDraft] = useState('');

    const add = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed || value.includes(trimmed)) return;
        onChange([...value, trimmed]);
    };

    const remaining = (suggestions ?? []).filter((s) => !value.includes(s));

    return (
        <div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-white dark:bg-black px-2 py-1.5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
                {value.map((chip) => (
                    <span key={chip} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                        {renderLabel(chip)}
                        <button
                            type="button"
                            onClick={() => onChange(value.filter((c) => c !== chip))}
                            aria-label={removeLabel}
                            className="rounded-full hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <XIcon className="size-3" />
                        </button>
                    </span>
                ))}
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
                            e.preventDefault();
                            add(draft);
                            setDraft('');
                        } else if (e.key === 'Backspace' && !draft && value.length > 0) {
                            e.preventDefault();
                            onChange([...value.slice(0, -1)]);
                        }
                    }}
                    placeholder={value.length === 0 ? placeholder : (morePlaceholder ?? placeholder)}
                    className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>
            {remaining.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                    {remaining.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => add(s)}
                            className={cn(
                                'rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors',
                                'hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            )}
                        >
                            + {renderLabel(s)}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
