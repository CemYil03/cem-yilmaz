import { parseISO } from 'date-fns';
import { LinkIcon, PaperclipIcon, SendIcon, XIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMutation } from 'urql';
import { uploadFile } from '../chat/fileUpload';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { DateTimePicker } from './base/date-time-picker';
import { Input } from './base/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from './base/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import type {
    GqlCAdminProjectActivityChannel,
    GqlCAdminProjectActivityDirection,
    GqlCAdminProjectActivityKind,
    GqlCAdminProjectOfferStatus,
} from '../graphql/generated';
import { WorkspaceProjectDetailUpsertActivitiesDocument } from '../graphql/generated';
import {
    ACTIVITY_CHANNEL_LABELS,
    ACTIVITY_CHANNEL_ORDER,
    ACTIVITY_DIRECTION_LABELS,
    ACTIVITY_KIND_LABELS,
    ACTIVITY_KIND_ORDER,
    DURATION_CHANNELS,
    OFFER_STATUS_LABELS,
    OFFER_STATUS_ORDER,
    defaultDirectionForKind,
} from './WorkspaceProjectActivityConstants';
import type { WorkspaceProjectActivityRow, WorkspaceProjectTaskRow } from './WorkspaceProjectActivityConstants';

// Add / edit composer for a project activity row. Reuses the shared
// `InputGroup` message-composer surface (a free-form textarea with Enter to
// send, Shift+Enter for a newline). Only shows the fields that make sense for
// the current kind/channel selection. In add mode it resets in place after a
// successful send; in edit mode it swaps the send button for Cancel / Save and
// closes on save. See `docs/features/workspace-projects.md`.
export function WorkspaceProjectActivityComposer({
    activity,
    projectId,
    tasks,
    locale,
    onClose,
    onSaved,
}: {
    activity: WorkspaceProjectActivityRow | null;
    projectId: string;
    tasks: ReadonlyArray<WorkspaceProjectTaskRow>;
    locale: Locale;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = activity !== null;
    const [, upsert] = useMutation(WorkspaceProjectDetailUpsertActivitiesDocument);
    const [kind, setKind] = useState<GqlCAdminProjectActivityKind>(
        activity?.kind === 'work' ? 'note' : (activity?.kind ?? 'clientContact'),
    );
    const [channel, setChannel] = useState<GqlCAdminProjectActivityChannel | null>(activity?.channel ?? null);
    const [direction, setDirection] = useState<GqlCAdminProjectActivityDirection>(
        activity?.direction ?? defaultDirectionForKind(activity?.kind === 'work' ? 'note' : (activity?.kind ?? 'clientContact'), null),
    );
    // The single free-form body. Title is no longer a manual concept — a
    // titleless row renders with the kind label as its heading. When editing a
    // legacy / agent-authored row that carries a title, we preserve it as-is.
    const [body, setBody] = useState(activity?.notes ?? '');
    const [occurredAt, setOccurredAt] = useState<Date>(activity ? parseISO(activity.occurredAt as unknown as string) : new Date());
    const [durationMin, setDurationMin] = useState<string>(activity?.durationSec ? String(Math.round(activity.durationSec / 60)) : '');
    const [taskId, setTaskId] = useState<string | null>(activity?.taskId ?? null);
    const [amountEur, setAmountEur] = useState<string>(activity?.amountCents != null ? String(activity.amountCents / 100) : '');
    const [offerStatus, setOfferStatus] = useState<GqlCAdminProjectOfferStatus | null>(activity?.offerStatus ?? null);
    const [attachLinkUrl, setAttachLinkUrl] = useState('');
    const [linkOpen, setLinkOpen] = useState(false);
    const [attachFile, setAttachFile] = useState<{ fileUploadId: string; filename: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const channelEnabled = kind === 'clientContact' || kind === 'meeting';
    const offerFieldsEnabled = kind === 'offer';
    // A video call is a shared moment (centered like a note) — no direction to
    // pick. Otherwise direction is a real choice only for client-facing kinds.
    const directionEnabled = (kind === 'clientContact' || kind === 'meeting' || kind === 'offer') && channel !== 'videoCall';
    // Duration only makes sense for a live conversation with a length. A
    // meeting is live by nature; a channelled contact is live only on
    // phone / video / in-person. Malt messages and email have no duration.
    const durationEnabled = kind === 'meeting' || (channel != null && DURATION_CHANNELS.includes(channel));

    const canSubmit =
        !busy && !uploading && (body.trim().length > 0 || (!isEdit && (attachLinkUrl.trim().length > 0 || attachFile !== null)));

    const submit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        const durationSec = durationEnabled && durationMin ? Math.max(0, Math.round(Number(durationMin) * 60)) : null;
        const amountCents = offerFieldsEnabled && amountEur ? Math.round(Number(amountEur) * 100) : null;
        await upsert({
            activityId: activity?.activityId ?? null,
            projectId,
            taskId,
            kind,
            channel: channelEnabled ? channel : null,
            direction: directionEnabled ? direction : null,
            // Preserve an existing heading on edit; manual composer entries carry none.
            title: activity?.title ?? null,
            notes: body.trim() || null,
            occurredAt: occurredAt.toISOString(),
            durationSec,
            amountCents: offerFieldsEnabled ? amountCents : null,
            offerStatus: offerFieldsEnabled ? offerStatus : null,
            attachLinkUrl: !isEdit && attachLinkUrl.trim() ? attachLinkUrl.trim() : null,
            attachLinkKind: !isEdit && attachLinkUrl.trim() ? 'other' : null,
            attachLinkLabel: null,
            attachLinkPinned: false,
            attachFileUploadId: !isEdit && attachFile ? attachFile.fileUploadId : null,
            attachFileKind: !isEdit && attachFile ? 'other' : null,
            attachFileLabel: !isEdit && attachFile ? attachFile.filename : null,
            attachFilePinned: false,
        });
        setBusy(false);
        // Reset the composer for the next entry (add mode); edit mode just closes.
        if (!isEdit) {
            setBody('');
            setAttachLinkUrl('');
            setLinkOpen(false);
            setAttachFile(null);
            setDurationMin('');
        }
        onSaved();
    };

    return (
        <form
            className="grid gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
        >
            {/* Control row — kind + context selectors. Compact, wraps on narrow. */}
            <div className="flex flex-wrap items-center gap-1.5">
                <Select
                    value={kind}
                    onValueChange={(v: GqlCAdminProjectActivityKind) => {
                        setKind(v);
                        setDirection(defaultDirectionForKind(v, channel));
                    }}
                >
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ACTIVITY_KIND_ORDER.filter((k) => k !== 'work').map((k) => (
                            <SelectItem key={k} value={k}>
                                {ACTIVITY_KIND_LABELS[k][locale]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {channelEnabled ? (
                    <Select
                        value={channel ?? '__none'}
                        onValueChange={(v) => {
                            const next = v === '__none' ? null : (v as GqlCAdminProjectActivityChannel);
                            setChannel(next);
                            setDirection(defaultDirectionForKind(kind, next));
                        }}
                    >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder={{ de: 'Kanal', en: 'Channel' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">{{ de: 'Kein Kanal', en: 'No channel' }[locale]}</SelectItem>
                            {ACTIVITY_CHANNEL_ORDER.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {ACTIVITY_CHANNEL_LABELS[c][locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}
                {directionEnabled ? (
                    <Select value={direction} onValueChange={(v: GqlCAdminProjectActivityDirection) => setDirection(v)}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder={{ de: 'Richtung', en: 'Direction' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="outgoing">{ACTIVITY_DIRECTION_LABELS.outgoing[locale]}</SelectItem>
                            <SelectItem value="incoming">{ACTIVITY_DIRECTION_LABELS.incoming[locale]}</SelectItem>
                        </SelectContent>
                    </Select>
                ) : null}
                <DateTimePicker
                    value={occurredAt}
                    onValueChange={(d) => setOccurredAt(d)}
                    locale={DATE_FNS_LOCALE[locale]}
                    className="h-8 w-[210px] text-xs"
                />
                {durationEnabled ? (
                    <Input
                        type="number"
                        min="0"
                        step="1"
                        value={durationMin}
                        onChange={(e) => setDurationMin(e.target.value)}
                        placeholder={{ de: 'Dauer (min)', en: 'Duration (min)' }[locale]}
                        className="h-8 w-28 text-xs"
                    />
                ) : null}
                {tasks.length > 0 ? (
                    <Select value={taskId ?? '__none'} onValueChange={(v) => setTaskId(v === '__none' ? null : v)}>
                        <SelectTrigger className="h-8 w-[170px] text-xs">
                            <SelectValue placeholder={{ de: 'Aufgabe', en: 'Task' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">{{ de: 'Keine Aufgabe', en: 'No task' }[locale]}</SelectItem>
                            {tasks.map((t) => (
                                <SelectItem key={t.taskId} value={t.taskId}>
                                    {t.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : null}
            </div>

            {offerFieldsEnabled ? (
                <div className="flex flex-wrap gap-1.5">
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountEur}
                        onChange={(e) => setAmountEur(e.target.value)}
                        placeholder={{ de: 'Betrag (€)', en: 'Amount (€)' }[locale]}
                        className="h-8 w-40 text-xs"
                    />
                    <Select
                        value={offerStatus ?? '__none'}
                        onValueChange={(v) => setOfferStatus(v === '__none' ? null : (v as GqlCAdminProjectOfferStatus))}
                    >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue placeholder={{ de: 'Status', en: 'Status' }[locale]} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none">{{ de: 'Kein Status', en: 'No status' }[locale]}</SelectItem>
                            {OFFER_STATUS_ORDER.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {OFFER_STATUS_LABELS[s][locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : null}

            {/* Body composer — the message-composer surface. Attach affordances
             * are quiet icon buttons in the bottom addon, not full-width panels. */}
            <InputGroup className="bg-white dark:bg-black">
                {!isEdit && (attachLinkUrl.trim().length > 0 || attachFile !== null || linkOpen) ? (
                    <InputGroupAddon align="block-start" className="flex-wrap gap-1.5 py-2">
                        {linkOpen ? (
                            <Input
                                value={attachLinkUrl}
                                onChange={(e) => setAttachLinkUrl(e.target.value)}
                                placeholder="https://…"
                                className="h-7 flex-1 min-w-[180px] text-xs"
                                autoFocus
                            />
                        ) : null}
                        {attachFile ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[11px]">
                                <PaperclipIcon className="size-3" />
                                <span className="max-w-[160px] truncate">{attachFile.filename}</span>
                                <button
                                    type="button"
                                    aria-label={{ de: 'Entfernen', en: 'Remove' }[locale]}
                                    onClick={() => setAttachFile(null)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <XIcon className="size-3" />
                                </button>
                            </span>
                        ) : null}
                    </InputGroupAddon>
                ) : null}

                <InputGroupTextarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void submit();
                        }
                    }}
                    placeholder={
                        isEdit
                            ? { de: 'Eintrag bearbeiten …', en: 'Edit entry …' }[locale]
                            : { de: 'Was ist passiert? (Enter zum Senden)', en: 'What happened? (Enter to send)' }[locale]
                    }
                    rows={2}
                    className="field-sizing-content max-h-[40vh]"
                    autoFocus={isEdit}
                />

                <InputGroupAddon align="block-end">
                    {!isEdit ? (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploading(true);
                                    try {
                                        const uploaded = await uploadFile(file);
                                        setAttachFile({ fileUploadId: uploaded.fileUploadId, filename: uploaded.filename });
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setUploading(false);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }
                                }}
                            />
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={{ de: 'Link anhängen', en: 'Attach link' }[locale]}
                                aria-pressed={linkOpen}
                                className={cn(linkOpen && 'text-foreground')}
                                onClick={() => setLinkOpen((v) => !v)}
                            >
                                <LinkIcon />
                            </InputGroupButton>
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={uploading}
                                aria-label={{ de: 'Datei anhängen', en: 'Attach file' }[locale]}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <PaperclipIcon />
                            </InputGroupButton>
                        </>
                    ) : null}
                    {isEdit ? (
                        <div className="ml-auto flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" size="sm" disabled={!canSubmit}>
                                {{ de: 'Speichern', en: 'Save' }[locale]}
                            </Button>
                        </div>
                    ) : (
                        <InputGroupButton
                            type="submit"
                            variant="default"
                            size="icon-xs"
                            className="ml-auto"
                            disabled={!canSubmit}
                            aria-label={{ de: 'Senden', en: 'Send' }[locale]}
                        >
                            <SendIcon />
                        </InputGroupButton>
                    )}
                </InputGroupAddon>
            </InputGroup>
        </form>
    );
}
