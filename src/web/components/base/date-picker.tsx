import * as React from 'react';
import { format } from 'date-fns';
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
}: {
    value?: Date;
    onValueChange?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    align?: React.ComponentProps<typeof PopoverContent>['align'];
    disabled?: React.ComponentProps<typeof Calendar>['disabled'];
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    data-slot="date-picker-trigger"
                    data-empty={!value}
                    className={cn('w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground', className)}
                >
                    {value ? format(value, 'PPP') : <span>{placeholder}</span>}
                    <ChevronDownIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar mode="single" selected={value} onSelect={onValueChange} defaultMonth={value} disabled={disabled} />
            </PopoverContent>
        </Popover>
    );
}

export { DatePicker };
