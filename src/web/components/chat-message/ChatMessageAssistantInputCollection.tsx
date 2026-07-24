import { parseISO } from 'date-fns';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { formatIsoDate } from '../../../shared';
import type { DateTimeDraft, SlotDraft, SlotDraftOf } from '../../chat/chatAssistantInputKinds';
import { formatAnswerValue, serializeSlotAnswer } from '../../chat/chatAssistantInputKinds';
import type {
    GqlCChatAssistantInput,
    GqlCChatAssistantInputValue,
    GqlCChatMessageAssistantInputCollection,
    GqlCChatMessageUserInput,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AssistantReasoning } from '../AssistantReasoning';
import { Button } from '../base/button';
import { Card, CardContent, CardHeader, CardTitle } from '../base/card';
import { DatePicker } from '../base/date-picker';
import { DateRangePicker } from '../base/date-range-picker';
import { Input } from '../base/input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../base/input-otp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../base/select';
import { Textarea } from '../base/textarea';
import { MessageRow, Timestamp } from './shared';

type SlotDrafts = Record<string, SlotDraft | undefined>;

/** A collection card has three visual states. The matching `ChatMessageUserInput`
 *  row drives the transition: absent → pending; present with answers → answered;
 *  present with empty answers → skipped (the synthetic empty-answers row written
 *  when the user pivoted away to a free-text message). See "Rendering — folded
 *  into the collection card" in docs/architecture/chat.md. */
type CollectionState = 'pending' | 'answered' | 'skipped';

function deriveState(userInput: GqlCChatMessageUserInput | undefined): CollectionState {
    if (!userInput) return 'pending';
    return userInput.answers.length > 0 ? 'answered' : 'skipped';
}

export function ChatMessageAssistantInputCollectionView({
    message,
    isInteractive,
    userInput,
    onSubmit,
    reasoningText,
}: {
    message: GqlCChatMessageAssistantInputCollection;
    /** True only when the collection is the last message in the chat AND has no
     *  matching `ChatMessageUserInput` yet — see chat.md's interactivity rule. */
    isInteractive: boolean;
    /** The user's reply, if one exists (real answers or synthetic empty-answers
     *  pivot row). */
    userInput?: GqlCChatMessageUserInput;
    /** Submit handler. Called with whatever answers the user filled in —
     *  partial sets are valid because every slot is independently optional.
     *  Pivoting away to a free-text message is handled server-side (synthetic
     *  empty-answers row), not through this callback. */
    onSubmit?: (collectionMessageId: string, answers: ReadonlyArray<{ inputId: string; value: GqlCChatAssistantInputValue }>) => void;
    reasoningText?: string;
}) {
    const locale = useLocale();
    const state = deriveState(userInput);
    const [drafts, setDrafts] = React.useState<SlotDrafts>({});

    const setDraft = React.useCallback((inputId: string, value: SlotDraft) => {
        setDrafts((previous) => ({ ...previous, [inputId]: value }));
    }, []);

    // Every slot is optional — `promptUserForInput` no longer carries a
    // `required` flag. Submit is therefore always enabled while interactive;
    // partial answers (or none at all) are valid. A user who wants to abandon
    // the form entirely can just send a free-text message instead — the server
    // synthesizes an empty-answers row that flips this card to its skipped
    // state.
    const collectAnswers = React.useCallback(
        () =>
            message.inputs.flatMap((slot) => {
                const draft = drafts[slot.inputId];
                if (!draft) return [];
                const value = serializeSlotAnswer(draft);
                return value ? [{ inputId: slot.inputId, value }] : [];
            }),
        [drafts, message.inputs],
    );

    // Index the user's answers by inputId for O(1) lookup during the answered
    // render. Skipped state has no answers, so the map stays empty.
    const answersByInputId = React.useMemo(() => {
        const map = new Map<string, GqlCChatAssistantInputValue>();
        if (userInput) {
            for (const answer of userInput.answers) map.set(answer.inputId, answer.value);
        }
        return map;
    }, [userInput]);

    return (
        <MessageRow side="assistant">
            <div className="flex w-full max-w-md flex-col gap-2">
                {reasoningText ? <AssistantReasoning text={reasoningText} /> : null}
                <Card className="w-full gap-4 py-4" aria-disabled={state !== 'pending'} data-state={state} data-mode={message.mode}>
                    <CardHeader>
                        <CardTitle className="text-sm whitespace-pre-wrap">{message.prompt}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {state === 'pending' && message.mode === 'StepThrough' ? (
                            <CollectionStepThrough
                                inputs={message.inputs}
                                drafts={drafts}
                                setDraft={setDraft}
                                isInteractive={isInteractive && Boolean(onSubmit)}
                                onSubmit={() => onSubmit?.(message.chatMessageId, collectAnswers())}
                            />
                        ) : null}
                        {state === 'pending' && message.mode !== 'StepThrough'
                            ? message.inputs.map((slot) => (
                                  <ChatAssistantInputSlotView
                                      key={slotKey(slot)}
                                      slot={slot}
                                      draft={drafts[slot.inputId]}
                                      onChange={(next) => setDraft(slot.inputId, next)}
                                  />
                              ))
                            : null}
                        {state !== 'pending' ? (
                            <CollectionAnswerSummary inputs={message.inputs} answersByInputId={answersByInputId} locale={locale} />
                        ) : null}
                        {state === 'pending' && message.mode !== 'StepThrough' && isInteractive && onSubmit ? (
                            <Button
                                size="sm"
                                onClick={() => onSubmit(message.chatMessageId, collectAnswers())}
                                className="justify-self-start"
                            >
                                {{ de: 'Absenden', en: 'Submit' }[locale]}
                            </Button>
                        ) : null}
                        <CollectionFooter state={state} promptedAt={message.createdAt} respondedAt={userInput?.createdAt} />
                    </CardContent>
                </Card>
            </div>
        </MessageRow>
    );
}

/** Compact `prompt → answer` list shown once the user has responded. Each
 *  prompt sits on its own line with the answer stacked beneath it — the
 *  earlier side-by-side layout squeezed answers into a thin gutter when the
 *  prompt was long. Slots the user left empty (only possible when the slot
 *  is optional) render as muted "—" so the row count still matches the
 *  original form. */
function CollectionAnswerSummary({
    inputs,
    answersByInputId,
    locale,
}: {
    inputs: ReadonlyArray<GqlCChatAssistantInput>;
    answersByInputId: ReadonlyMap<string, GqlCChatAssistantInputValue>;
    locale: Locale;
}) {
    return (
        <ul className="grid gap-2 text-sm">
            {inputs.map((slot) => {
                const answer = answersByInputId.get(slot.inputId);
                return (
                    <li key={slot.inputId} className="grid gap-0.5">
                        <span className="text-muted-foreground">{slot.prompt}</span>
                        <span className={cn('text-foreground', !answer && 'text-muted-foreground/60')}>
                            {answer ? formatAnswerValue(answer, locale) : '—'}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

/** Step-through wizard rendering: shows a single slot at a time with
 *  Back / Skip / Next controls. Submission is identical to the form path —
 *  the wizard accumulates drafts in the parent's `SlotDrafts` state and the
 *  Submit on the last slot calls the same `onSubmit` the form does, so the
 *  server is unaware of which UI assembled the answers. Per-slot Skip just
 *  advances without writing into the draft (matches the form's "every slot
 *  is optional" rule). */
function CollectionStepThrough({
    inputs,
    drafts,
    setDraft,
    isInteractive,
    onSubmit,
}: {
    inputs: ReadonlyArray<GqlCChatAssistantInput>;
    drafts: SlotDrafts;
    setDraft: (inputId: string, value: SlotDraft) => void;
    isInteractive: boolean;
    onSubmit: () => void;
}) {
    const locale = useLocale();
    const [stepIndex, setStepIndex] = React.useState(0);
    // Clamp on input-list changes (e.g. live update arrives mid-wizard) so
    // we don't index past the end.
    const safeIndex = Math.min(stepIndex, Math.max(0, inputs.length - 1));
    const slot = inputs[safeIndex];

    // Move focus into the new slot's first focusable control on every step
    // change so keyboard users land on the input directly, and skip the very
    // first render so the wizard doesn't yank focus from the chat composer
    // when the message first appears.
    const slotRef = React.useRef<HTMLDivElement>(null);
    const isFirstRender = React.useRef(true);
    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const el = slotRef.current?.querySelector<HTMLElement>(
            'input, textarea, button, [role="radio"], [role="checkbox"], [tabindex]:not([tabindex="-1"])',
        );
        el?.focus();
    }, [safeIndex]);

    if (!slot) return null;

    const isFirst = safeIndex === 0;
    const isLast = safeIndex === inputs.length - 1;

    const advance = () => {
        if (isLast) onSubmit();
        else setStepIndex(safeIndex + 1);
    };
    const goBack = () => setStepIndex(Math.max(0, safeIndex - 1));

    return (
        <div className="grid gap-3">
            <div role="status" aria-live="polite" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {{ de: `Schritt ${safeIndex + 1} / ${inputs.length}`, en: `Step ${safeIndex + 1} / ${inputs.length}` }[locale]}
            </div>
            <div ref={slotRef}>
                <ChatAssistantInputSlotView
                    key={slotKey(slot)}
                    slot={slot}
                    draft={drafts[slot.inputId]}
                    onChange={(next) => setDraft(slot.inputId, next)}
                />
            </div>
            {isInteractive ? (
                // DOM order is Next → Skip → Back so Tab from the input lands
                // on the primary action first; CSS `order` + `justify-end`
                // restore the conventional visual layout (Back left, Skip +
                // Next right).
                <div className="flex items-center justify-end gap-2">
                    <Button type="button" size="sm" onClick={advance} className="order-3">
                        {isLast ? { de: 'Absenden', en: 'Submit' }[locale] : { de: 'Weiter', en: 'Next' }[locale]}
                        {!isLast ? <ChevronRightIcon aria-hidden /> : null}
                    </Button>
                    {!isLast ? (
                        <Button type="button" variant="outline" size="sm" onClick={advance} className="order-2">
                            {{ de: 'Überspringen', en: 'Skip' }[locale]}
                        </Button>
                    ) : null}
                    {!isFirst ? (
                        <Button type="button" variant="ghost" size="sm" onClick={goBack} className="order-1 mr-auto">
                            <ChevronLeftIcon aria-hidden />
                            {{ de: 'Zurück', en: 'Back' }[locale]}
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

/** Footer line under the card body. Pending shows just the prompt timestamp;
 *  answered/skipped tag the response timestamp with a state label so the user
 *  sees at a glance that the form is closed. */
function CollectionFooter({
    state,
    promptedAt,
    respondedAt,
}: {
    state: CollectionState;
    promptedAt: string;
    respondedAt: string | undefined;
}) {
    const locale = useLocale();
    if (state === 'pending') return <Timestamp iso={promptedAt} />;
    const iso = respondedAt ?? promptedAt;
    return (
        <div className="mt-1 flex items-center gap-1 text-[11px] opacity-70">
            {state === 'answered' ? <CheckIcon className="size-3" aria-hidden /> : null}
            <span>
                {state === 'answered' ? { de: 'Beantwortet', en: 'Answered' }[locale] : { de: 'Übersprungen', en: 'Skipped' }[locale]}
            </span>
            <span aria-hidden>·</span>
            <Timestamp iso={iso} className="mt-0" />
        </div>
    );
}

function slotKey(slot: GqlCChatAssistantInput): string {
    return slot.__typename ? `${slot.__typename}:${slot.inputId}` : slot.inputId;
}

function ChatAssistantInputSlotView({
    slot,
    draft,
    onChange,
}: {
    slot: GqlCChatAssistantInput;
    draft: SlotDraft | undefined;
    onChange: (next: SlotDraft) => void;
}) {
    // No type headline (Date / Text / Choose one…) above the control: the
    // slot's own `prompt` already says what it wants, and the control itself
    // (calendar, OTP boxes, Yes/No pair) signals the kind. See docs/styles/chat.md.
    return (
        <div
            data-slot="chat-assistant-input-slot"
            data-kind={slot.__typename}
            className="grid gap-2 rounded-md border bg-background/50 p-3"
        >
            <div className="text-sm">{slot.prompt}</div>
            <ChatAssistantInputControl slot={slot} draft={draft} onChange={onChange} />
        </div>
    );
}

// Each control narrows `draft` to the matching `SlotDraft` variant via the
// helper `useDraftOf`, so the per-control props stay precisely typed. Unknown
// or stale draft shapes (e.g. when the slot type changes mid-life) fall back
// to a fresh empty draft for that kind.
function ChatAssistantInputControl({
    slot,
    draft,
    onChange,
}: {
    slot: GqlCChatAssistantInput;
    draft: SlotDraft | undefined;
    onChange: (next: SlotDraft) => void;
}) {
    switch (slot.__typename) {
        case 'ChatAssistantInputDate':
            return <DateControl value={draftOf(draft, 'Date')?.date} onChange={(date) => onChange({ kind: 'Date', date })} />;
        case 'ChatAssistantInputDateRange': {
            const rangeDraft = draftOf(draft, 'DateRange');
            return (
                <DateRangeControl
                    from={rangeDraft?.from}
                    to={rangeDraft?.to}
                    onChange={(from, to) => onChange({ kind: 'DateRange', from, to })}
                />
            );
        }
        case 'ChatAssistantInputDateTime':
            return (
                <DateTimeControl
                    value={draftOf(draft, 'DateTime')?.dateTime}
                    onChange={(dateTime) => onChange({ kind: 'DateTime', dateTime })}
                />
            );
        case 'ChatAssistantInputTime':
            return <TimeControl value={draftOf(draft, 'Time')?.time ?? ''} onChange={(time) => onChange({ kind: 'Time', time })} />;
        case 'ChatAssistantInputSingleSelect':
            return (
                <SingleSelectControl
                    options={slot.options}
                    value={draftOf(draft, 'SingleSelect')?.selected}
                    onChange={(selected) => onChange({ kind: 'SingleSelect', selected })}
                    placeholder={slot.prompt}
                />
            );
        case 'ChatAssistantInputMultiSelect':
            return (
                <MultiSelectControl
                    options={slot.options}
                    value={draftOf(draft, 'MultiSelect')?.selected ?? []}
                    onChange={(selected) => onChange({ kind: 'MultiSelect', selected })}
                />
            );
        case 'ChatAssistantInputBoolean':
            return <BooleanControl value={draftOf(draft, 'Boolean')?.value} onChange={(value) => onChange({ kind: 'Boolean', value })} />;
        case 'ChatAssistantInputText':
            return <TextControl value={draftOf(draft, 'Text')?.text ?? ''} onChange={(text) => onChange({ kind: 'Text', text })} />;
        case 'ChatAssistantInputOtp':
            return <OtpControl value={draftOf(draft, 'Otp')?.code ?? ''} onChange={(code) => onChange({ kind: 'Otp', code })} />;
        case undefined:
            return null;
    }
}

/** Narrow a draft to a specific kind, returning `undefined` if it isn't that
 *  kind (or doesn't exist). Centralizes the discriminator check the controls
 *  would otherwise do inline. */
function draftOf<TKind extends SlotDraft['kind']>(draft: SlotDraft | undefined, kind: TKind): SlotDraftOf<TKind> | undefined {
    return draft && draft.kind === kind ? (draft as SlotDraftOf<TKind>) : undefined;
}

// --- Concrete controls -------------------------------------------------------

function DateControl({
    value,
    onChange,
}: {
    /** ISO date (YYYY-MM-DD) — the wire shape of `ChatAssistantInputValueDate.date`. */
    value: string | undefined;
    onChange: (next: string | undefined) => void;
}) {
    // `DatePicker` works in `Date`; we adapt at the boundary so the wire-shape
    // (ISO `YYYY-MM-DD`) stays the storage type and submit doesn't have to
    // serialize.
    const locale = useLocale();
    return (
        <DatePicker
            value={value ? parseISO(value) : undefined}
            onValueChange={(next) => onChange(next ? formatIsoDate(next) : undefined)}
            className="w-full"
            locale={DATE_FNS_LOCALE[locale]}
            placeholder={{ de: 'Datum wählen', en: 'Pick a date' }[locale]}
        />
    );
}

function DateRangeControl({
    from,
    to,
    onChange,
}: {
    /** ISO date (YYYY-MM-DD) for each endpoint, matching the wire shape of
     *  `ChatAssistantInputValueDateRange.from` / `.to`. Both `undefined` until
     *  the user opens the picker. */
    from: string | undefined;
    to: string | undefined;
    onChange: (from: string | undefined, to: string | undefined) => void;
}) {
    // `DateRangePicker` works in react-day-picker's `DateRange` shape
    // (`{ from?: Date, to?: Date }`); we adapt at the boundary so the draft
    // keeps the wire-shape strings and serialization stays trivial. Submit
    // gating (both endpoints required) lives in `serializeSlotAnswer` — the
    // picker itself happily allows partial selections during interaction.
    const locale = useLocale();
    const value: DateRange | undefined =
        from || to ? { from: from ? parseISO(from) : undefined, to: to ? parseISO(to) : undefined } : undefined;
    return (
        <DateRangePicker
            value={value}
            onValueChange={(next) =>
                onChange(next?.from ? formatIsoDate(next.from) : undefined, next?.to ? formatIsoDate(next.to) : undefined)
            }
            className="w-full"
            locale={DATE_FNS_LOCALE[locale]}
            placeholder={{ de: 'Zeitraum wählen', en: 'Pick dates' }[locale]}
        />
    );
}

function SingleSelectControl({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: ReadonlyArray<string>;
    value: string | undefined;
    onChange: (next: string) => void;
    placeholder: string;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function MultiSelectControl({
    options,
    value,
    onChange,
}: {
    options: ReadonlyArray<string>;
    value: ReadonlyArray<string>;
    onChange: (next: ReadonlyArray<string>) => void;
}) {
    const selected = React.useMemo(() => new Set(value), [value]);
    const locale = useLocale();
    // Toggle chips beat a Radix DropdownMenu here: the option count is small,
    // chat density is tight, and selection is visible at a glance without an
    // extra open/close interaction.
    return (
        <ul className="flex flex-wrap gap-1.5" role="group" aria-label={{ de: 'Beliebige auswählen', en: 'Choose any' }[locale]}>
            {options.map((option) => {
                const isSelected = selected.has(option);
                return (
                    <li key={option}>
                        <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            onClick={() => {
                                const next = new Set(selected);
                                if (isSelected) next.delete(option);
                                else next.add(option);
                                // Preserve the original option order in the emitted array so
                                // the answer reads stably regardless of click sequence.
                                onChange(options.filter((o) => next.has(o)));
                            }}
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
                            )}
                        >
                            {isSelected ? <CheckIcon className="size-3" aria-hidden /> : null}
                            {option}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function DateTimeControl({ value, onChange }: { value: DateTimeDraft | undefined; onChange: (next: DateTimeDraft) => void }) {
    const locale = useLocale();
    return (
        <div className="flex gap-2">
            <DatePicker
                value={value?.date ? parseISO(value.date) : undefined}
                onValueChange={(next) => onChange({ date: next ? formatIsoDate(next) : undefined, time: value?.time })}
                className="flex-1"
                locale={DATE_FNS_LOCALE[locale]}
                placeholder={{ de: 'Datum wählen', en: 'Pick a date' }[locale]}
            />
            <Input
                type="time"
                value={value?.time ?? ''}
                onChange={(event) => onChange({ date: value?.date, time: event.target.value || undefined })}
                className="w-30"
                aria-label={{ de: 'Uhrzeit', en: 'Time' }[locale]}
            />
        </div>
    );
}

function TimeControl({ value, onChange }: { value: string; onChange: (next: string) => void }) {
    const locale = useLocale();
    return (
        <Input
            type="time"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full"
            aria-label={{ de: 'Uhrzeit', en: 'Time' }[locale]}
        />
    );
}

function TextControl({ value, onChange }: { value: string; onChange: (next: string) => void }) {
    const locale = useLocale();
    return (
        <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={{ de: 'Antwort eingeben…', en: 'Type your answer…' }[locale]}
            rows={2}
        />
    );
}

/** Six-digit OTP entry, used for verifying ownership of an email after
 *  `submitProjectRequest`. Wraps the existing `<InputOTP>` base primitive
 *  (`src/web/components/base/input-otp.tsx`). The draft holds the raw
 *  six-character string; `serializeSlotAnswer` is the submit gate (only
 *  emits a value once six digits are present). The pattern restriction is
 *  enforced both visually (digit-only input mode) and at serialize time
 *  with `/^\d{6}$/`. */
function OtpControl({ value, onChange }: { value: string; onChange: (next: string) => void }) {
    const locale = useLocale();
    return (
        <InputOTP
            maxLength={6}
            value={value}
            onChange={onChange}
            pattern="^[0-9]*$"
            inputMode="numeric"
            aria-label={{ de: 'Bestätigungscode', en: 'Verification code' }[locale]}
        >
            <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
            </InputOTPGroup>
        </InputOTP>
    );
}

/** Yes / No button pair. The selected button becomes filled (`default`
 *  variant); the other stays outlined. Matches the chip density of the
 *  multi-select control so two adjacent rows read consistently. Until the
 *  user clicks one, both stay outlined — that's the "no draft yet" state
 *  `serializeSlotAnswer` reads as `null`. */
function BooleanControl({ value, onChange }: { value: boolean | undefined; onChange: (next: boolean) => void }) {
    const locale = useLocale();
    return (
        <div className="flex gap-2" role="radiogroup" aria-label={{ de: 'Ja oder nein', en: 'Yes or no' }[locale]}>
            <Button
                type="button"
                role="radio"
                aria-checked={value === true}
                variant={value === true ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => onChange(true)}
            >
                {{ de: 'Ja', en: 'Yes' }[locale]}
            </Button>
            <Button
                type="button"
                role="radio"
                aria-checked={value === false}
                variant={value === false ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => onChange(false)}
            >
                {{ de: 'Nein', en: 'No' }[locale]}
            </Button>
        </div>
    );
}
