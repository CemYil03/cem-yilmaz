import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../utils/cn';

function DateRangePicker({
    value,
    onValueChange,
    placeholder = 'Pick a date',
    className,
    align = 'start',
    numberOfMonths = 2,
    disabled,
    captionLayout,
    startMonth,
    endMonth,
}: {
    value?: DateRange;
    onValueChange?: (range: DateRange | undefined) => void;
    placeholder?: string;
    className?: string;
    align?: React.ComponentProps<typeof PopoverContent>['align'];
    numberOfMonths?: number;
    disabled?: React.ComponentProps<typeof Calendar>['disabled'];
    /**
     * Calendar caption layout. `'label'` (default) renders a plain title with
     * single-month arrows. `'dropdown'` swaps month and year for selectors so
     * jumping across many years takes one click each — pick this for ranges
     * that can span many years.
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
                    data-slot="date-range-picker-trigger"
                    data-empty={!value?.from}
                    className={cn('justify-start px-2.5 font-normal data-[empty=true]:text-muted-foreground', className)}
                >
                    <CalendarIcon />
                    {value?.from ? (
                        value.to ? (
                            <>
                                {format(value.from, 'LLL dd, y')} - {format(value.to, 'LLL dd, y')}
                            </>
                        ) : (
                            format(value.from, 'LLL dd, y')
                        )
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar
                    mode="range"
                    defaultMonth={value?.from}
                    selected={value}
                    onSelect={onValueChange}
                    numberOfMonths={numberOfMonths}
                    disabled={disabled}
                    captionLayout={captionLayout}
                    startMonth={startMonth}
                    endMonth={endMonth}
                />
            </PopoverContent>
        </Popover>
    );
}

export { DateRangePicker };
