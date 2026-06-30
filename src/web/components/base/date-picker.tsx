import * as React from 'react';
import { format } from 'date-fns';
import type { Locale } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../utils/cn';

function DatePicker({
    value,
    onValueChange,
    placeholder = 'Pick a date',
    className,
    align = 'start',
    disabled,
    locale,
    captionLayout,
    startMonth,
    endMonth,
}: {
    value?: Date;
    onValueChange?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    align?: React.ComponentProps<typeof PopoverContent>['align'];
    disabled?: React.ComponentProps<typeof Calendar>['disabled'];
    /** date-fns locale; localizes the trigger label and the calendar grid. */
    locale?: Locale;
    /**
     * Calendar caption layout. `'label'` (default) renders a plain title with
     * single-month arrows. `'dropdown'` swaps month and year for selectors so
     * jumping across many years takes one click each — pick this for fields
     * that span large date ranges (CV start/end dates, date-of-birth, ...).
     */
    captionLayout?: React.ComponentProps<typeof Calendar>['captionLayout'];
    /** Earliest month the navigation allows. Defaults to 100 years before today when a dropdown layout is active. */
    startMonth?: Date;
    /** Latest month the navigation allows. Defaults to the end of the current year when a dropdown layout is active. */
    endMonth?: Date;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-slot="date-picker-trigger"
                    data-empty={!value}
                    className={cn(
                        'w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground bg-white dark:bg-black',
                        className,
                    )}
                >
                    {value ? format(value, 'PPP', { locale }) : <span>{placeholder}</span>}
                    <ChevronDownIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onValueChange}
                    defaultMonth={value}
                    disabled={disabled}
                    locale={locale}
                    captionLayout={captionLayout}
                    startMonth={startMonth}
                    endMonth={endMonth}
                />
            </PopoverContent>
        </Popover>
    );
}

export { DatePicker };
