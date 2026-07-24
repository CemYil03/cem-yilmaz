// Single source of truth for the eight assistant-input kinds. The chat-message
// component, the user-input answer view, and the route's submit-flatten helper
// all read from this file so adding a new slot kind touches one entry.
//
// - INPUT_VALUE_REGISTRY — keyed by `ChatAssistantInputValue.__typename`. Owns
//   the human-readable formatter (used by `<ChatMessageUserInput>`) and the
//   GraphQL flat-`kind` input shaper (used by the route's submit handler).
//
// Drafts (the per-slot in-progress UI state) are a discriminated union keyed
// by slot kind — see `SlotDraft` below — so each control gets a precisely
// typed `value` without ad-hoc type guards.

import { format, parseISO } from 'date-fns';
import { formatDate, formatDateRange } from '../../shared';
import type { GqlCChatAssistantInputValue, GqlCChatMessageUserInputAnswerCreate } from '../graphql/generated';
import type { Locale } from '../utils/locale';

// --- Drafts (per-slot in-progress UI state) ---------------------------------

export interface DateTimeDraft {
    /** YYYY-MM-DD picked from the calendar. */
    date?: string;
    /** HH:mm typed into the time input. */
    time?: string;
}

/** Discriminated union of the per-slot draft shape. The `kind` tag matches the
 *  `kind` field on `ChatAssistantInputValue` (`Date`, `DateTime`, `Time`, ...) so
 *  a draft can be matched against the slot it lives under. Empty fields stand
 *  in for "the user hasn't filled this yet". `DateRange` requires both `from`
 *  and `to` to be present before it serializes to a submittable value. */
export type SlotDraft =
    | { kind: 'Date'; date?: string }
    | { kind: 'DateRange'; from?: string; to?: string }
    | { kind: 'DateTime'; dateTime?: DateTimeDraft }
    | { kind: 'Time'; time?: string }
    | { kind: 'SingleSelect'; selected?: string }
    | { kind: 'MultiSelect'; selected?: ReadonlyArray<string> }
    | { kind: 'Boolean'; value?: boolean }
    | { kind: 'Text'; text?: string }
    | { kind: 'Otp'; code?: string };

export type SlotDraftOf<TKind extends SlotDraft['kind']> = Extract<SlotDraft, { kind: TKind }>;

// --- Draft → wire serializer ------------------------------------------------
//
// Single source of truth for "is this slot's draft submittable, and what is
// the typed value if so?". Returns null for missing / empty / partial drafts
// so the caller can use it as both the completeness gate and the producer.

/**
 * Combine the calendar-picked date and the typed time into the ISO 8601
 * instant the `DateTime` scalar expects. Returns null if either side is
 * missing or the shape is malformed.
 */
function combineDateTimeDraft(draft: DateTimeDraft | undefined): string | null {
    if (!draft || !draft.date || !draft.time) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return null;
    if (!/^\d{2}:\d{2}$/.test(draft.time)) return null;
    // Build a local-tz Date and emit ISO. The server's `DateTime` scalar
    // parses ISO directly; we don't second-guess the timezone here.
    const combined = new Date(`${draft.date}T${draft.time}:00`);
    if (Number.isNaN(combined.getTime())) return null;
    return combined.toISOString();
}

export function serializeSlotAnswer(draft: SlotDraft): GqlCChatAssistantInputValue | null {
    switch (draft.kind) {
        case 'Date':
            return draft.date ? { __typename: 'ChatAssistantInputValueDate', date: draft.date } : null;
        case 'DateRange':
            // Both endpoints required — partial ranges stay un-submittable, the
            // Submit button reads the resulting `null` as "still empty".
            return draft.from && draft.to ? { __typename: 'ChatAssistantInputValueDateRange', from: draft.from, to: draft.to } : null;
        case 'DateTime': {
            const iso = combineDateTimeDraft(draft.dateTime);
            return iso ? { __typename: 'ChatAssistantInputValueDateTime', dateTime: iso } : null;
        }
        case 'Time':
            return draft.time && /^\d{2}:\d{2}$/.test(draft.time) ? { __typename: 'ChatAssistantInputValueTime', time: draft.time } : null;
        case 'SingleSelect':
            return draft.selected ? { __typename: 'ChatAssistantInputValueString', value: draft.selected } : null;
        case 'MultiSelect':
            return draft.selected && draft.selected.length > 0
                ? { __typename: 'ChatAssistantInputValueStringList', values: [...draft.selected] }
                : null;
        case 'Boolean':
            return typeof draft.value === 'boolean' ? { __typename: 'ChatAssistantInputValueBoolean', boolean: draft.value } : null;
        case 'Text':
            return draft.text && draft.text.trim().length > 0 ? { __typename: 'ChatAssistantInputValueString', value: draft.text } : null;
        case 'Otp':
            // Submit only when exactly six digits are present — the
            // `<InputOTP>` component already enforces digits via its
            // `pattern`, but the gate here doubles as the "is the form
            // submittable" check the parent reads off of `null`.
            return draft.code && /^\d{6}$/.test(draft.code) ? { __typename: 'ChatAssistantInputValueString', value: draft.code } : null;
    }
}

// --- Answer values (keyed by `ChatAssistantInputValue.__typename`) ----------

/** Produce a human-readable rendering of a typed answer value. Used by
 *  `<ChatMessageUserInput>` to print previously-submitted answers. */
export function formatAnswerValue(value: GqlCChatAssistantInputValue, locale: Locale): string {
    switch (value.__typename) {
        case 'ChatAssistantInputValueDate':
            return formatDate(value.date, { locale });
        case 'ChatAssistantInputValueDateRange':
            return formatDateRange(value.from, value.to, { locale });
        case 'ChatAssistantInputValueDateTime':
            return format(parseISO(value.dateTime), 'PPpp');
        case 'ChatAssistantInputValueTime':
            return value.time;
        case 'ChatAssistantInputValueString':
            return value.value;
        case 'ChatAssistantInputValueStringList':
            return value.values.join(', ');
        case 'ChatAssistantInputValueBoolean':
            return value.boolean ? { de: 'Ja', en: 'Yes' }[locale] : { de: 'Nein', en: 'No' }[locale];
        case undefined:
            return '';
    }
}

/** Flatten a typed `ChatAssistantInputValue` into the GraphQL flat-`kind`
 *  input shape `chatInputCollectionRespond` accepts. Inverse of the lift in
 *  `src/server/commands/chatInputCollectionRespond.ts`. */
export function toFlatAnswerInput(inputId: string, value: GqlCChatAssistantInputValue): GqlCChatMessageUserInputAnswerCreate {
    switch (value.__typename) {
        case 'ChatAssistantInputValueDate':
            return { inputId, kind: 'Date', date: value.date };
        case 'ChatAssistantInputValueDateRange':
            return { inputId, kind: 'DateRange', dateRangeFrom: value.from, dateRangeTo: value.to };
        case 'ChatAssistantInputValueDateTime':
            return { inputId, kind: 'DateTime', dateTime: value.dateTime };
        case 'ChatAssistantInputValueTime':
            return { inputId, kind: 'Time', time: value.time };
        case 'ChatAssistantInputValueString':
            return { inputId, kind: 'String', string: value.value };
        case 'ChatAssistantInputValueStringList':
            return { inputId, kind: 'StringList', stringList: [...value.values] };
        case 'ChatAssistantInputValueBoolean':
            return { inputId, kind: 'Boolean', boolean: value.boolean };
        case undefined:
            // The serializer never produces this — guard satisfies the
            // exhaustive check on the discriminated union.
            return { inputId, kind: 'String', string: '' };
    }
}
