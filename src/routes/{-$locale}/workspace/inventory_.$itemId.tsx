import { createFileRoute, Link } from '@tanstack/react-router';
import { parseISO } from 'date-fns';
import { formatCurrency, formatDate, formatIsoDate } from '../../../shared';
import {
    ArrowLeftIcon,
    CircleDollarSignIcon,
    FileTextIcon,
    ImageIcon,
    PackageIcon,
    PaperclipIcon,
    PencilIcon,
    PinIcon,
    PinOffIcon,
    PlusIcon,
    ReceiptTextIcon,
    ShieldCheckIcon,
    Trash2Icon,
    TrendingUpIcon,
    UploadIcon,
    WrenchIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { uploadFile } from '../../../web/chat/fileUpload';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../../web/components/base/alert-dialog';
import { Button } from '../../../web/components/base/button';
import { DatePicker } from '../../../web/components/base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Textarea } from '../../../web/components/base/textarea';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminInventoryItemDisposalState,
    GqlCAdminInventoryItemFileKind,
    GqlCAdminInventoryItemServiceKind,
    GqlCWorkspaceInventoryDetailUpdatesSubscription,
    GqlCWorkspaceInventoryDetailUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceInventoryDetailDocument,
    WorkspaceInventoryDetailUpdatesDocument,
    WorkspaceItemFilesAttachDocument,
    WorkspaceItemFilesDeleteDocument,
    WorkspaceItemFilesUpsertDocument,
    WorkspaceItemsRepriceDocument,
    WorkspaceItemsUpsertDocument,
    WorkspaceItemServiceEntriesDeleteDocument,
    WorkspaceItemServiceEntriesUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Per-item detail. Reachable from a card on `/workspace/inventory`. Loads
// the singular `admin.inventory.item(id)` — which includes the valuations
// journal, service entries (with per-entry files), and the full file list.
// Same seed-and-subscribe posture as the list. See
// `docs/features/workspace-inventory.md`.

type Admin = NonNullable<GqlCWorkspaceInventoryDetailUserFragment['admin']>;
type ItemDetail = NonNullable<Admin['adminInventoryFindOne']['adminInventoryItemFindOne']>;
type Valuation = ItemDetail['valuations'][number];
type ServiceEntry = ItemDetail['serviceEntries'][number];
type ItemFileRow = ItemDetail['files'][number];

const SERVICE_KIND_LABELS: Record<GqlCAdminInventoryItemServiceKind, { de: string; en: string }> = {
    service: { de: 'Wartung', en: 'Service' },
    repair: { de: 'Reparatur', en: 'Repair' },
    replacement: { de: 'Austausch', en: 'Replacement' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const DISPOSAL_LABELS: Record<GqlCAdminInventoryItemDisposalState, { de: string; en: string }> = {
    owned: { de: 'Im Besitz', en: 'Owned' },
    sold: { de: 'Verkauft', en: 'Sold' },
    gifted: { de: 'Verschenkt', en: 'Gifted' },
    lost: { de: 'Verloren', en: 'Lost' },
    disposed: { de: 'Entsorgt', en: 'Disposed' },
};

const FILE_KIND_LABELS: Record<GqlCAdminInventoryItemFileKind, { de: string; en: string }> = {
    photo: { de: 'Foto', en: 'Photo' },
    receipt: { de: 'Quittung', en: 'Receipt' },
    warranty: { de: 'Garantie', en: 'Warranty' },
    manual: { de: 'Anleitung', en: 'Manual' },
    invoice: { de: 'Rechnung', en: 'Invoice' },
    other: { de: 'Sonstiges', en: 'Other' },
};

export const Route = createFileRoute('/{-$locale}/workspace/inventory_/$itemId')({
    loader: ({ params }) => routeLoaderGraphqlClient(WorkspaceInventoryDetailDocument, { itemId: params.itemId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Eintrag', en: 'AdminInventoryItem' }[locale],
            description: { de: 'Inventar-Detail', en: 'Inventory item detail' }[locale],
            path: `/workspace/inventory/${params.itemId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceInventoryDetail,
});

function WorkspaceInventoryDetail() {
    const locale = useLocale();
    const { itemId } = Route.useParams();
    const data = Route.useLoaderData();
    const user = useDetailLiveUser(data.sessionFindOne.user, itemId);

    const admin = user?.admin;
    const item = admin?.adminInventoryFindOne.adminInventoryItemFindOne ?? null;

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!item) return <NotFound locale={locale} />;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full py-10 leading-relaxed space-y-8">
            <Link
                to="/{-$locale}/workspace/inventory"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
                <ArrowLeftIcon className="size-3.5" />
                {{ de: 'Zum Inventar', en: 'Back to inventory' }[locale]}
            </Link>

            <Header item={item} locale={locale} />
            <FactsGrid item={item} locale={locale} />
            <ValuationsSection item={item} locale={locale} />
            <ServiceSection item={item} locale={locale} />
            <FilesSection item={item} locale={locale} />
        </main>
    );
}

// --- Header -----------------------------------------------------------------

function Header({ item, locale }: { item: ItemDetail; locale: Locale }) {
    const [disposing, setDisposing] = useState(false);
    const disposalState = item.disposalState;
    return (
        <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <PackageIcon className="size-5 text-muted-foreground" aria-hidden />
                    <h1 className="text-2xl font-semibold tracking-tight truncate">{item.name}</h1>
                </div>
                {item.brand || item.model ? (
                    <p className="mt-1 text-sm text-muted-foreground truncate">{[item.brand, item.model].filter(Boolean).join(' · ')}</p>
                ) : null}
            </div>
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        disposalState === 'owned'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted/60 text-muted-foreground',
                    )}
                >
                    {DISPOSAL_LABELS[disposalState][locale]}
                </span>
                <Button size="sm" variant="outline" onClick={() => setDisposing(true)}>
                    {{ de: 'Status ändern', en: 'Change status' }[locale]}
                </Button>
            </div>
            {disposing ? <DisposeDialog item={item} locale={locale} onClose={() => setDisposing(false)} /> : null}
        </header>
    );
}

// --- Facts grid -------------------------------------------------------------

function FactsGrid({ item, locale }: { item: ItemDetail; locale: Locale }) {
    const [repricing, setRepricing] = useState(false);
    return (
        <section aria-label={{ de: 'Grunddaten', en: 'Facts' }[locale]}>
            <GlassCard className="px-5 py-5">
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                    <Fact label={{ de: 'Kaufdatum', en: 'Purchased' }[locale]} value={formatDate(item.purchasedAt, { locale })} />
                    <Fact
                        label={{ de: 'Kaufpreis', en: 'Purchase price' }[locale]}
                        value={formatCurrency(item.purchasePriceCents, { locale, nullAs: 'emDash' })}
                    />
                    <Fact
                        label={{ de: 'Aktueller Wert', en: 'Current value' }[locale]}
                        value={formatCurrency(item.currentValueCents, { locale, nullAs: 'emDash' })}
                        action={
                            <Button size="sm" variant="ghost" onClick={() => setRepricing(true)}>
                                <TrendingUpIcon className="size-3.5" />
                                {{ de: 'Neu bewerten', en: 'Reprice' }[locale]}
                            </Button>
                        }
                    />
                    <Fact label={{ de: 'Seriennummer', en: 'Serial number' }[locale]} value={item.serialNumber ?? '—'} />
                    <Fact
                        label={{ de: 'Garantie bis', en: 'Warranty until' }[locale]}
                        value={formatDate(item.warrantyEndsAt, { locale })}
                    />
                    <Fact label={{ de: 'Garantiegeber', en: 'Warranty provider' }[locale]} value={item.warrantyProvider ?? '—'} />
                </dl>
                {item.warrantyNotes ? (
                    <div className="mt-4 rounded-md bg-muted/30 p-3 text-xs">
                        <div className="text-muted-foreground mb-1 flex items-center gap-1.5">
                            <ShieldCheckIcon className="size-3.5" />
                            {{ de: 'Garantiehinweise', en: 'Warranty notes' }[locale]}
                        </div>
                        <p className="whitespace-pre-wrap">{item.warrantyNotes}</p>
                    </div>
                ) : null}
                {item.notes ? (
                    <div className="mt-3 rounded-md bg-muted/20 p-3 text-xs">
                        <div className="text-muted-foreground mb-1">{{ de: 'Notizen', en: 'Notes' }[locale]}</div>
                        <p className="whitespace-pre-wrap">{item.notes}</p>
                    </div>
                ) : null}
            </GlassCard>
            {repricing ? <RepriceDialog item={item} locale={locale} onClose={() => setRepricing(false)} /> : null}
        </section>
    );
}

function Fact({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                {action}
            </div>
            <dd className="mt-0.5 truncate tabular-nums">{value}</dd>
        </div>
    );
}

// --- Valuations -------------------------------------------------------------

function ValuationsSection({ item, locale }: { item: ItemDetail; locale: Locale }) {
    const valuations = item.valuations;
    return (
        <section aria-labelledby="valuations-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="valuations-heading" className="flex items-center gap-2 text-lg font-medium">
                    <CircleDollarSignIcon className="size-4 text-muted-foreground" />
                    {{ de: 'Bewertungen', en: 'Valuations' }[locale]}
                </h2>
                <span className="text-xs text-muted-foreground">
                    {{ de: `${valuations.length} Einträge`, en: `${valuations.length} entries` }[locale]}
                </span>
            </div>
            {valuations.length === 0 ? (
                <GlassCard className="px-5 py-6 text-sm text-muted-foreground">
                    {{ de: 'Noch keine Bewertungen. Nutze „Neu bewerten“ oben.', en: 'No valuations yet. Use “Reprice” above.' }[locale]}
                </GlassCard>
            ) : (
                <GlassCard className="px-5 py-4">
                    <Sparkline points={valuations} />
                    <ul className="mt-4 divide-y divide-border/60 text-sm">
                        {valuations.map((v) => (
                            <li key={v.valuationId} className="flex items-center justify-between gap-3 py-2">
                                <div className="min-w-0">
                                    <div className="tabular-nums font-medium">
                                        {formatCurrency(v.valueCents, { locale, nullAs: 'emDash' })}
                                    </div>
                                    {v.note ? <div className="text-xs text-muted-foreground truncate">{v.note}</div> : null}
                                </div>
                                <div className="text-xs tabular-nums text-muted-foreground shrink-0">
                                    {formatDate(v.valuedAt, { locale })}
                                </div>
                            </li>
                        ))}
                    </ul>
                </GlassCard>
            )}
        </section>
    );
}

function Sparkline({ points }: { points: ReadonlyArray<Valuation> }) {
    // Ordered oldest-first for the trend line. Server returns newest-first.
    const ordered = useMemo(() => [...points].reverse(), [points]);
    if (ordered.length < 2) return null;
    const values = ordered.map((p) => p.valueCents);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 400;
    const height = 60;
    const path = ordered
        .map((p, i) => {
            const x = (i / (ordered.length - 1)) * width;
            const y = height - ((p.valueCents - min) / range) * height;
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ');
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" role="img" aria-label="Value over time">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
        </svg>
    );
}

// --- Service log ------------------------------------------------------------

function ServiceSection({ item, locale }: { item: ItemDetail; locale: Locale }) {
    const [editing, setEditing] = useState<ServiceEntry | 'new' | null>(null);
    const [deleting, setDeleting] = useState<ServiceEntry | null>(null);

    return (
        <section aria-labelledby="service-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="service-heading" className="flex items-center gap-2 text-lg font-medium">
                    <WrenchIcon className="size-4 text-muted-foreground" />
                    {{ de: 'Wartungshistorie', en: 'Service history' }[locale]}
                </h2>
                <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
                    <PlusIcon className="size-3.5" />
                    {{ de: 'Eintrag hinzufügen', en: 'Add entry' }[locale]}
                </Button>
            </div>
            {item.serviceEntries.length === 0 ? (
                <GlassCard className="px-5 py-6 text-sm text-muted-foreground">
                    {{ de: 'Noch keine Einträge.', en: 'No entries yet.' }[locale]}
                </GlassCard>
            ) : (
                <div className="space-y-2">
                    {item.serviceEntries.map((entry) => (
                        <ServiceEntryCard
                            key={entry.serviceEntryId}
                            entry={entry}
                            locale={locale}
                            onEdit={() => setEditing(entry)}
                            onDelete={() => setDeleting(entry)}
                        />
                    ))}
                </div>
            )}
            {editing !== null ? (
                <ServiceEntryDialog
                    itemId={item.itemId}
                    initial={editing === 'new' ? null : editing}
                    locale={locale}
                    onClose={() => setEditing(null)}
                />
            ) : null}
            {deleting !== null ? <DeleteServiceEntryAlert entry={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </section>
    );
}

function ServiceEntryCard({
    entry,
    locale,
    onEdit,
    onDelete,
}: {
    entry: ServiceEntry;
    locale: Locale;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <GlassCard className="group px-4 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {SERVICE_KIND_LABELS[entry.kind][locale]}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{formatDate(entry.performedAt, { locale })}</span>
                        {entry.vendor ? <span className="text-muted-foreground truncate">· {entry.vendor}</span> : null}
                        {entry.costCents != null ? (
                            <span className="ml-auto tabular-nums font-medium">
                                {formatCurrency(entry.costCents, { locale, nullAs: 'emDash' })}
                            </span>
                        ) : null}
                    </div>
                    {entry.notes ? <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{entry.notes}</p> : null}
                    {entry.nextDueAt ? (
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                            {
                                {
                                    de: `Nächste Wartung: ${formatDate(entry.nextDueAt, { locale })}`,
                                    en: `Next due: ${formatDate(entry.nextDueAt, { locale })}`,
                                }[locale]
                            }
                        </p>
                    ) : null}
                    {entry.files.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                            {entry.files.map((f) => (
                                <li key={f.itemFileId}>
                                    <a
                                        href={f.fileUpload.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1 hover:bg-muted/60"
                                    >
                                        <PaperclipIcon className="size-3" />
                                        <span className="truncate max-w-[16rem]">{f.label ?? f.fileUpload.filename}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={onEdit}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={onDelete}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </GlassCard>
    );
}

// --- Files ------------------------------------------------------------------

function FilesSection({ item, locale }: { item: ItemDetail; locale: Locale }) {
    const [uploading, setUploading] = useState(false);
    const [attachKind, setAttachKind] = useState<GqlCAdminInventoryItemFileKind>('receipt');
    const [error, setError] = useState<string | null>(null);
    const [, attach] = useMutation(WorkspaceItemFilesAttachDocument);
    const [, togglePin] = useMutation(WorkspaceItemFilesUpsertDocument);
    const [, del] = useMutation(WorkspaceItemFilesDeleteDocument);

    const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setError(null);
        setUploading(true);
        try {
            const uploaded = await uploadFile(file);
            await attach({
                inputs: [
                    {
                        itemId: item.itemId,
                        fileUploadId: uploaded.fileUploadId,
                        kind: attachKind,
                        label: uploaded.filename,
                        pinned: false,
                    },
                ],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setUploading(false);
        }
    };

    return (
        <section aria-labelledby="files-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="files-heading" className="flex items-center gap-2 text-lg font-medium">
                    <PaperclipIcon className="size-4 text-muted-foreground" />
                    {{ de: 'Dateien', en: 'Files' }[locale]}
                </h2>
                <div className="flex items-center gap-2">
                    <Select value={attachKind} onValueChange={(v) => setAttachKind(v as GqlCAdminInventoryItemFileKind)}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(FILE_KIND_LABELS) as GqlCAdminInventoryItemFileKind[]).map((k) => (
                                <SelectItem key={k} value={k}>
                                    {FILE_KIND_LABELS[k][locale]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={onFileChange} disabled={uploading} />
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent',
                                uploading && 'opacity-50 pointer-events-none',
                            )}
                        >
                            <UploadIcon className="size-3.5" />
                            {uploading
                                ? { de: 'Wird hochgeladen…', en: 'Uploading…' }[locale]
                                : { de: 'Datei anhängen', en: 'Attach file' }[locale]}
                        </span>
                    </label>
                </div>
            </div>
            {error ? <div className="text-xs text-destructive">{error}</div> : null}
            {item.files.length === 0 ? (
                <GlassCard className="px-5 py-6 text-sm text-muted-foreground">
                    {
                        {
                            de: 'Noch keine Dateien angehängt. Lade Quittungen, Garantie-PDFs oder Fotos hoch.',
                            en: 'No files attached. Upload receipts, warranty PDFs, or photos.',
                        }[locale]
                    }
                </GlassCard>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.files.map((f) => (
                        <FileCard
                            key={f.itemFileId}
                            file={f}
                            locale={locale}
                            onTogglePin={() => togglePin({ itemFiles: [{ itemFileId: f.itemFileId, pinned: !f.pinned }] })}
                            onDelete={() => del({ itemFileIds: [f.itemFileId] })}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function FileCard({
    file,
    locale,
    onTogglePin,
    onDelete,
}: {
    file: ItemFileRow;
    locale: Locale;
    onTogglePin: () => void;
    onDelete: () => void;
}) {
    const isImage = file.fileUpload.mediaType.startsWith('image/');
    return (
        <li className="group">
            <GlassCard className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted/40">
                        {isImage ? (
                            <ImageIcon className="size-4 text-muted-foreground" />
                        ) : file.kind === 'receipt' || file.kind === 'invoice' ? (
                            <ReceiptTextIcon className="size-4 text-muted-foreground" />
                        ) : (
                            <FileTextIcon className="size-4 text-muted-foreground" />
                        )}
                    </div>
                    <a
                        href={file.fileUpload.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium truncate">
                            {file.pinned ? <PinIcon className="size-3 text-amber-500" aria-label="Pinned" /> : null}
                            <span className="truncate">{file.label ?? file.fileUpload.filename}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                            {FILE_KIND_LABELS[file.kind][locale]} · {formatBytes(file.fileUpload.size)}
                        </div>
                    </a>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={onTogglePin}
                            aria-label={{ de: 'Anpinnen', en: 'Pin' }[locale]}
                        >
                            {file.pinned ? <PinOffIcon className="size-3.5" /> : <PinIcon className="size-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive/70 hover:text-destructive"
                            onClick={onDelete}
                            aria-label={{ de: 'Entfernen', en: 'Remove' }[locale]}
                        >
                            <Trash2Icon className="size-3.5" />
                        </Button>
                    </div>
                </div>
            </GlassCard>
        </li>
    );
}

// --- Dialogs ----------------------------------------------------------------

function RepriceDialog({ item, locale, onClose }: { item: ItemDetail; locale: Locale; onClose: () => void }) {
    const [value, setValue] = useState(item.currentValueCents != null ? (item.currentValueCents / 100).toFixed(2) : '');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [, reprice] = useMutation(WorkspaceItemsRepriceDocument);
    const submit = async () => {
        const cents = eurosToCents(value);
        if (cents == null) return;
        setSubmitting(true);
        try {
            const result = await reprice({ inputs: [{ itemId: item.itemId, valueCents: cents, note: note.trim() || null }] });
            if (!result.error) onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Neu bewerten', en: 'Reprice' }[locale]}</DialogTitle>
                    <DialogDescription>{{ de: 'Aktuellen Wert protokollieren.', en: 'Log a new valuation.' }[locale]}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Wert (EUR)', en: 'Value (EUR)' }[locale]}</span>
                        <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Notiz', en: 'Note' }[locale]}</span>
                        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || eurosToCents(value) == null}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DisposeDialog({ item, locale, onClose }: { item: ItemDetail; locale: Locale; onClose: () => void }) {
    const [state, setState] = useState<GqlCAdminInventoryItemDisposalState>(item.disposalState);
    const [submitting, setSubmitting] = useState(false);
    const [, upsert] = useMutation(WorkspaceItemsUpsertDocument);
    const submit = async () => {
        setSubmitting(true);
        try {
            // Disposal is a field-set on the upsert now — carry the existing
            // row through so only the disposal state changes. The server
            // clears `disposedAt` when the state is `owned` and defaults it to
            // now when transitioning into a disposal state.
            const result = await upsert({
                items: [
                    {
                        itemId: item.itemId,
                        categoryKey: item.categoryKey,
                        name: item.name,
                        brand: item.brand,
                        model: item.model,
                        serialNumber: item.serialNumber,
                        purchasedAt: item.purchasedAt,
                        purchasePriceCents: item.purchasePriceCents,
                        condition: item.condition,
                        warrantyEndsAt: item.warrantyEndsAt,
                        warrantyProvider: item.warrantyProvider,
                        warrantyNotes: item.warrantyNotes,
                        notes: item.notes,
                        disposalState: state,
                        disposedAt: state === 'owned' ? null : item.disposedAt,
                    },
                ],
            });
            if (!result.error) onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Status ändern', en: 'Change status' }[locale]}</DialogTitle>
                </DialogHeader>
                <Select value={state} onValueChange={(v) => setState(v as GqlCAdminInventoryItemDisposalState)}>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(DISPOSAL_LABELS) as GqlCAdminInventoryItemDisposalState[]).map((k) => (
                            <SelectItem key={k} value={k}>
                                {DISPOSAL_LABELS[k][locale]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ServiceEntryDialog({
    itemId,
    initial,
    locale,
    onClose,
}: {
    itemId: string;
    initial: ServiceEntry | null;
    locale: Locale;
    onClose: () => void;
}) {
    const [kind, setKind] = useState<GqlCAdminInventoryItemServiceKind>(initial?.kind ?? 'service');
    const [performedAt, setPerformedAt] = useState<Date | undefined>(initial?.performedAt ? parseISO(initial.performedAt) : new Date());
    const [vendor, setVendor] = useState(initial?.vendor ?? '');
    const [cost, setCost] = useState(initial?.costCents != null ? (initial.costCents / 100).toFixed(2) : '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [nextDueAt, setNextDueAt] = useState<Date | undefined>(initial?.nextDueAt ? parseISO(initial.nextDueAt) : undefined);
    const [submitting, setSubmitting] = useState(false);
    const [, upsert] = useMutation(WorkspaceItemServiceEntriesUpsertDocument);

    const submit = async () => {
        if (!performedAt) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                itemServiceEntries: [
                    {
                        serviceEntryId: initial?.serviceEntryId ?? null,
                        itemId,
                        kind,
                        performedAt: formatIsoDate(performedAt),
                        vendor: vendor.trim() || null,
                        costCents: eurosToCents(cost),
                        notes: notes.trim() || null,
                        nextDueAt: nextDueAt ? formatIsoDate(nextDueAt) : null,
                    },
                ],
            });
            if (!result.error) onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {initial
                            ? { de: 'Eintrag bearbeiten', en: 'Edit entry' }[locale]
                            : { de: 'Wartungseintrag anlegen', en: 'Add service entry' }[locale]}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Art', en: 'Kind' }[locale]}</span>
                        <Select value={kind} onValueChange={(v) => setKind(v as GqlCAdminInventoryItemServiceKind)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.keys(SERVICE_KIND_LABELS) as GqlCAdminInventoryItemServiceKind[]).map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {SERVICE_KIND_LABELS[k][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Datum', en: 'Performed on' }[locale]} *</span>
                        <DatePicker
                            value={performedAt}
                            onValueChange={setPerformedAt}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                        />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">
                            {{ de: 'Werkstatt / Anbieter', en: 'Vendor' }[locale]}
                        </span>
                        <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">
                            {{ de: 'Kosten (EUR)', en: 'Cost (EUR)' }[locale]}
                        </span>
                        <Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">
                            {{ de: 'Nächste Wartung', en: 'Next due' }[locale]}
                        </span>
                        <DatePicker
                            value={nextDueAt}
                            onValueChange={setNextDueAt}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                        />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Notizen', en: 'Notes' }[locale]}</span>
                        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || !performedAt}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteServiceEntryAlert({ entry, locale, onClose }: { entry: ServiceEntry; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceItemServiceEntriesDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ serviceEntryIds: [entry.serviceEntryId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Eintrag löschen?', en: 'Delete this entry?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `Wartungseintrag vom ${formatDate(entry.performedAt, { locale })} wird entfernt.`,
                                en: `Service entry from ${formatDate(entry.performedAt, { locale })} will be removed.`,
                            }[locale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={submitting}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction onClick={doDelete} disabled={submitting}>
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Misc -------------------------------------------------------------------

function NotFound({ locale }: { locale: Locale }) {
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-2xl mx-auto w-full py-16 text-center">
            <h1 className="text-xl font-semibold">{{ de: 'Nicht gefunden', en: 'Not found' }[locale]}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                {{ de: 'Dieser Inventar-Eintrag existiert nicht (mehr).', en: 'This inventory item does not exist (any more).' }[locale]}
            </p>
            <Button asChild variant="outline" className="mt-6">
                <Link to="/{-$locale}/workspace/inventory">{{ de: 'Zum Inventar', en: 'Back to inventory' }[locale]}</Link>
            </Button>
        </main>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function eurosToCents(input: string): number | null {
    const trimmed = input.trim().replace(',', '.');
    if (trimmed === '') return null;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) return null;
    return Math.round(parsed * 100);
}

// Seed-and-subscribe. `itemId` scopes the subscription — the detail
// fragment resolves `admin.adminInventoryFindOne.adminInventoryItemFindOne(itemId: $itemId)`,
// so we need to pass the id in as a variable so URQL matches the same
// fragment shape as the loader query. Mirrors `useWorkspaceMediaPageLiveUser`.
function useDetailLiveUser(
    seed: GqlCWorkspaceInventoryDetailUserFragment | null | undefined,
    itemId: string,
): GqlCWorkspaceInventoryDetailUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceInventoryDetailUpdatesDocument, { itemId });
        const operation = client.executeSubscription<GqlCWorkspaceInventoryDetailUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client, itemId]);

    return user;
}
