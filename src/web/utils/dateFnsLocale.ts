import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import type { Locale } from './locale';

// Maps our two-letter site locale onto the matching `date-fns` locale object
// used by `format()`, `formatDistanceToNow()`, and `react-day-picker`'s
// `Calendar` (via the base `DatePicker` / `DateRangePicker`).
export const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };
