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
}: {
    value?: DateRange;
    onValueChange?: (range: DateRange | undefined) => void;
    placeholder?: string;
    className?: string;
    align?: React.ComponentProps<typeof PopoverContent>['align'];
    numberOfMonths?: number;
    disabled?: React.ComponentProps<typeof Calendar>['disabled'];
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
                />
            </PopoverContent>
        </Popover>
    );
}

export { DateRangePicker };
