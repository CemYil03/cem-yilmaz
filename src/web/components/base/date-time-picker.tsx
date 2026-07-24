import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

// Date + time-of-day picker. Mirrors `DatePicker` (popover-anchored calendar)
// but the popover also carries a native `<input type="time">` so a single
// control captures a full timestamp — the shape the activity composer needs
// ("the call started at 14:30 today"). Selecting a day preserves the current
// time-of-day; editing the time preserves the day. The trigger renders the
// combined "14 March 2026, 14:30" label.
function DateTimePicker({
    value,
    onValueChange,
    placeholder = 'Pick a date & time',
    className,
    align = 'start',
    disabled,
    locale,
}: {
    value?: Date;
    onValueChange?: (date: Date) => void;
    placeholder?: string;
    className?: string;
    align?: React.ComponentProps<typeof PopoverContent>['align'];
    disabled?: React.ComponentProps<typeof Calendar>['disabled'];
    /** date-fns locale; localizes the trigger label and the calendar grid. */
    locale?: Locale;
}) {
    const timeValue = value ? format(value, 'HH:mm') : '';

    const setDay = (day: Date | undefined) => {
        if (!day) return;
        const base = value ?? new Date();
        const next = new Date(day);
        next.setHours(base.getHours(), base.getMinutes(), 0, 0);
        onValueChange?.(next);
    };

    const setTime = (raw: string) => {
        const [h, m] = raw.split(':');
        const hours = Number(h);
        const minutes = Number(m);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
        const next = new Date(value ?? new Date());
        next.setHours(hours, minutes, 0, 0);
        onValueChange?.(next);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-slot="date-time-picker-trigger"
                    data-empty={!value}
                    className={cn(
                        'w-[240px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground bg-white dark:bg-black',
                        className,
                    )}
                    disabled={disabled === true}
                >
                    {value ? format(value, 'PPP, HH:mm', { locale }) : <span>{placeholder}</span>}
                    <ChevronDownIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar mode="single" selected={value} onSelect={setDay} defaultMonth={value} disabled={disabled} locale={locale} />
                <div className="flex items-center gap-2 border-t border-border/60 p-3">
                    <Input type="time" value={timeValue} onChange={(e) => setTime(e.target.value)} className="w-full" aria-label="Time" />
                </div>
            </PopoverContent>
        </Popover>
    );
}

export { DateTimePicker };
