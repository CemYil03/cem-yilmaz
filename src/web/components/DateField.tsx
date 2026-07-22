import { parseISO } from 'date-fns';
import { formatIsoDate } from '../../shared';
import { DatePicker } from './base/date-picker';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';

// Bridges the ISO `YYYY-MM-DD` storage shape the GraphQL `Date` scalar
// expects over to the `Date`-based `DatePicker`. The mirrored input keeps
// native HTML5 `required` validation working — the picker itself is a
// popover trigger button, not a form control, so the browser can't see its
// value.
function DateField({
    value,
    onChange,
    required,
    locale,
    placeholder,
}: {
    value: string;
    onChange: (next: string) => void;
    required?: boolean;
    locale: Locale;
    placeholder?: string;
}) {
    return (
        <div className="relative">
            <DatePicker
                value={value ? parseISO(value) : undefined}
                onValueChange={(next) => onChange(next ? formatIsoDate(next) : '')}
                className="w-full"
                captionLayout="dropdown"
                locale={DATE_FNS_LOCALE[locale]}
                placeholder={placeholder}
            />
            {required ? (
                <input
                    tabIndex={-1}
                    aria-hidden
                    required
                    value={value}
                    onChange={() => {}}
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
                />
            ) : null}
        </div>
    );
}

export { DateField };
