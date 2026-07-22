import { createFileRoute, Link } from '@tanstack/react-router';
import { parseISO } from 'date-fns';
import { formatCurrency, formatDate, formatIsoDate } from '../../../shared';
import {
    ArrowUpRightIcon,
    GhostIcon,
    GiftIcon,
    LayersIcon,
    PackageIcon,
    PencilIcon,
    PlusIcon,
    ShieldAlertIcon,
    ShieldCheckIcon,
    ShieldXIcon,
    TagIcon,
    Trash2Icon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
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
    GqlCAdminInventoryItemCategory,
    GqlCAdminInventoryItemCondition,
    GqlCAdminInventoryItemDisposalState,
    GqlCWorkspaceInventoryPageUpdatesSubscription,
    GqlCWorkspaceInventoryPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceInventoryPageDocument,
    WorkspaceInventoryPageUpdatesDocument,
    WorkspaceItemsDeleteDocument,
    WorkspaceItemsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's material assets — coffee machine, car, TV,
// monitors, and so on. Admin-only, `noindex`. Same seed-and-subscribe
// posture as `/workspace/media` (see `useWorkspaceInventoryLiveUser`
// below): the loader seeds, `userUpdates` replaces on every server push,
// mutations don't re-fetch. See `docs/features/workspace-inventory.md`.
//
// The list is the primary surface. Per-item detail — valuations timeline,
// service log, files — lives on `/workspace/inventory/$itemId`, wired to
// the singular `admin.inventory.item(id)` query.

const title = { de: 'Inventar', en: 'Inventory' };
const description = { de: 'Materielle Besitztümer und ihr aktueller Wert.', en: 'Material belongings and their current value.' };

const CATEGORY_ORDER: ReadonlyArray<GqlCAdminInventoryItemCategory> = [
    'electronics',
    'appliance',
    'kitchen',
    'furniture',
    'vehicle',
    'clothing',
    'tool',
    'sports',
    'other',
];
const CATEGORY_LABELS: Record<GqlCAdminInventoryItemCategory, { de: string; en: string }> = {
    electronics: { de: 'Elektronik', en: 'Electronics' },
    appliance: { de: 'Geräte', en: 'Appliances' },
    kitchen: { de: 'Küche', en: 'Kitchen' },
    furniture: { de: 'Möbel', en: 'Furniture' },
    vehicle: { de: 'Fahrzeuge', en: 'Vehicles' },
    clothing: { de: 'Kleidung', en: 'Clothing' },
    tool: { de: 'Werkzeug', en: 'Tools' },
    sports: { de: 'Sport', en: 'Sports' },
    other: { de: 'Sonstiges', en: 'Other' },
};

const CONDITION_LABELS: Record<GqlCAdminInventoryItemCondition, { de: string; en: string }> = {
    new: { de: 'Neu', en: 'New' },
    likeNew: { de: 'Wie neu', en: 'Like new' },
    good: { de: 'Gut', en: 'Good' },
    fair: { de: 'Okay', en: 'Fair' },
    poor: { de: 'Schlecht', en: 'Poor' },
};

// URL state — filter is the only piece we keep in the URL so a bookmark to
// "show me disposed items" round-trips. Default is `owned` and is dropped
// from the query string so the canonical landing URL has no `?filter=`.
type DisposalFilter = 'owned' | 'all' | 'sold' | 'gifted' | 'lost' | 'disposed';
const DISPOSAL_FILTERS: ReadonlyArray<DisposalFilter> = ['owned', 'all', 'sold', 'gifted', 'lost', 'disposed'];
const DISPOSAL_LABELS: Record<DisposalFilter, { de: string; en: string }> = {
    owned: { de: 'Besitze', en: 'Owned' },
    all: { de: 'Alle', en: 'All' },
    sold: { de: 'Verkauft', en: 'Sold' },
    gifted: { de: 'Verschenkt', en: 'Gifted' },
    lost: { de: 'Verloren', en: 'Lost' },
    disposed: { de: 'Entsorgt', en: 'Disposed' },
};
const DISPOSAL_ICONS: Record<DisposalFilter, LucideIcon> = {
    owned: PackageIcon,
    all: LayersIcon,
    sold: TagIcon,
    gifted: GiftIcon,
    lost: GhostIcon,
    disposed: Trash2Icon,
};

const inventorySearchSchema = z.object({
    filter: z.enum(DISPOSAL_FILTERS).optional(),
});

type WorkspaceInventoryAdmin = NonNullable<GqlCWorkspaceInventoryPageUserFragment['admin']>;
type InventoryData = WorkspaceInventoryAdmin['adminInventoryFindOne'];
type ItemRow = InventoryData['adminInventoryItemFindMany'][number];
type WarrantyRow = InventoryData['adminInventoryItemUpcomingWarrantyFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/inventory')({
    validateSearch: inventorySearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceInventoryPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/inventory',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: InventoryArea,
});

function InventoryArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const user = useWorkspaceInventoryLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const inventory = admin?.adminInventoryFindOne;

    const filter: DisposalFilter = search.filter ?? 'owned';
    const [editing, setEditing] = useState<ItemRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<ItemRow | null>(null);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!inventory) return null;

    const filtered = inventory.adminInventoryItemFindMany.filter((row) => (filter === 'all' ? true : row.disposalState === filter));

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <OverviewStrip
                items={inventory.adminInventoryItemFindMany}
                netWorthCents={inventory.adminInventoryMaterialNetWorthCentsFindOne}
                warrantySoon={inventory.adminInventoryItemUpcomingWarrantyFindMany}
                locale={locale}
            />

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-b border-border/60">
                <FilterChips filter={filter} locale={locale} />
                <Button size="sm" onClick={() => setEditing('new')} className="mb-1">
                    <PlusIcon className="size-4" />
                    {{ de: 'Neuer Eintrag', en: 'New item' }[locale]}
                </Button>
            </div>

            <div className="mt-6">
                {filtered.length === 0 ? (
                    <EmptyState locale={locale} filter={filter} onNew={() => setEditing('new')} />
                ) : (
                    <GroupedList items={filtered} locale={locale} onEdit={setEditing} onDelete={setDeleting} />
                )}
            </div>

            {editing !== null ? (
                <EditItemDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? <DeleteItemAlert item={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
        </main>
    );
}

// --- Overview strip ---------------------------------------------------------

function OverviewStrip({
    items,
    netWorthCents,
    warrantySoon,
    locale,
}: {
    items: ReadonlyArray<ItemRow>;
    netWorthCents: number;
    warrantySoon: ReadonlyArray<WarrantyRow>;
    locale: Locale;
}) {
    const owned = items.filter((r) => r.disposalState === 'owned');
    return (
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {{ de: 'Materieller Nettowert', en: 'Material net worth' }[locale]}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatCurrency(netWorthCents, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {{ de: `${owned.length} aktive Einträge`, en: `${owned.length} owned items` }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4 md:col-span-2">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {{ de: 'Garantien enden bald', en: 'Warranty ending soon' }[locale]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {{ de: `${warrantySoon.length} in 60 Tagen`, en: `${warrantySoon.length} in 60 days` }[locale]}
                    </div>
                </div>
                {warrantySoon.length === 0 ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                        {{ de: 'Nichts anstehend.', en: 'Nothing coming up.' }[locale]}
                    </div>
                ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                        {warrantySoon.slice(0, 3).map((row) => (
                            <li key={row.itemId} className="flex items-center justify-between gap-3">
                                <Link
                                    to="/{-$locale}/workspace/inventory/$itemId"
                                    params={{ locale: locale === 'de' ? undefined : locale, itemId: row.itemId }}
                                    className="truncate hover:underline"
                                >
                                    {row.name}
                                    {row.brand ? <span className="text-muted-foreground"> · {row.brand}</span> : null}
                                </Link>
                                <span className="tabular-nums text-muted-foreground shrink-0">
                                    {formatDate(row.warrantyEndsAt, { locale })}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </GlassCard>
        </section>
    );
}

// --- Filter chips -----------------------------------------------------------

// Canonical top-of-page sub-view switcher — underlined section tabs. Same
// shape as every other workspace switcher (see `docs/conventions.md` —
// "Top-of-page sub-view switcher"). The parent container renders the
// bottom border across the full width and puts the "New item" button on
// the right of the same row.
function FilterChips({ filter, locale }: { filter: DisposalFilter; locale: Locale }) {
    return (
        <nav className="flex flex-wrap gap-1" aria-label={{ de: 'Filter', en: 'Filters' }[locale]}>
            {DISPOSAL_FILTERS.map((key) => {
                const isActive = filter === key;
                const Icon = DISPOSAL_ICONS[key];
                return (
                    <Link
                        key={key}
                        to="/{-$locale}/workspace/inventory"
                        from="/{-$locale}/workspace/inventory"
                        // Default filter (`owned`) drops the key so the
                        // canonical landing URL has no `?filter=`.
                        search={(prev) => ({ ...prev, filter: key === 'owned' ? undefined : key })}
                        replace
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <Icon className="size-4" />
                        {DISPOSAL_LABELS[key][locale]}
                    </Link>
                );
            })}
        </nav>
    );
}

// --- Grouped list -----------------------------------------------------------

function GroupedList({
    items,
    locale,
    onEdit,
    onDelete,
}: {
    items: ReadonlyArray<ItemRow>;
    locale: Locale;
    onEdit: (item: ItemRow) => void;
    onDelete: (item: ItemRow) => void;
}) {
    const groups = useMemo(() => {
        const byCategory = new Map<GqlCAdminInventoryItemCategory, ItemRow[]>();
        for (const row of items) {
            const list = byCategory.get(row.categoryKey) ?? [];
            list.push(row);
            byCategory.set(row.categoryKey, list);
        }
        return CATEGORY_ORDER.flatMap((key) => {
            const list = byCategory.get(key);
            if (!list || list.length === 0) return [];
            const total = list.reduce((sum, r) => sum + (r.currentValueCents ?? 0), 0);
            return [{ key, items: list, total }];
        });
    }, [items]);

    return (
        <div className="space-y-8">
            {groups.map((group) => (
                <section key={group.key} aria-labelledby={`inventory-cat-${group.key}`}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2
                            id={`inventory-cat-${group.key}`}
                            className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            {CATEGORY_LABELS[group.key][locale]}
                            <span className="ml-2 text-xs normal-case tracking-normal">
                                {{ de: `${group.items.length} Stück`, en: `${group.items.length} items` }[locale]}
                            </span>
                        </h2>
                        <div className="text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(group.total, { locale, maximumFractionDigits: 0 })}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {group.items.map((item) => (
                            <ItemCard key={item.itemId} item={item} locale={locale} onEdit={onEdit} onDelete={onDelete} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function ItemCard({
    item,
    locale,
    onEdit,
    onDelete,
}: {
    item: ItemRow;
    locale: Locale;
    onEdit: (item: ItemRow) => void;
    onDelete: (item: ItemRow) => void;
}) {
    const warranty = warrantyState(item.warrantyEndsAt);
    return (
        <GlassCard className="group px-4 py-4">
            <div className="flex items-start justify-between gap-3">
                <Link
                    to="/{-$locale}/workspace/inventory/$itemId"
                    params={{ locale: locale === 'de' ? undefined : locale, itemId: item.itemId }}
                    className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                    <div className="flex items-center gap-1.5 text-base font-semibold truncate">
                        <span className="truncate">{item.name}</span>
                        <ArrowUpRightIcon
                            className="size-3.5 shrink-0 text-muted-foreground/50 transition-[color,transform] group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </div>
                    {item.brand || item.model ? (
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            {[item.brand, item.model].filter(Boolean).join(' · ')}
                        </div>
                    ) : null}
                </Link>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(item)}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => onDelete(item)}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    {warranty && item.warrantyEndsAt ? (
                        <WarrantyBadge state={warranty} endsAt={item.warrantyEndsAt} locale={locale} />
                    ) : null}
                    {item.condition ? (
                        <span className="ml-1 inline-block rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {CONDITION_LABELS[item.condition][locale]}
                        </span>
                    ) : null}
                </div>
                <div className="text-right shrink-0">
                    {item.currentValueCents !== null ? (
                        <div className="text-sm font-semibold tabular-nums">
                            {formatCurrency(item.currentValueCents, { locale, maximumFractionDigits: 0 })}
                        </div>
                    ) : null}
                    {item.purchasedAt ? (
                        <div className="text-[10px] text-muted-foreground tabular-nums">
                            {{ de: 'Gekauft ', en: 'Bought ' }[locale]}
                            {formatDate(item.purchasedAt, { locale })}
                        </div>
                    ) : null}
                </div>
            </div>
        </GlassCard>
    );
}

function WarrantyBadge({ state, endsAt, locale }: { state: 'ok' | 'soon' | 'expired'; endsAt: string; locale: Locale }) {
    const label = formatDate(endsAt, { locale });
    const [Icon, cls, ariaLabel] =
        state === 'ok'
            ? [
                  ShieldCheckIcon,
                  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                  { de: `Garantie bis ${label}`, en: `Warranty until ${label}` }[locale],
              ]
            : state === 'soon'
              ? [
                    ShieldAlertIcon,
                    'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    { de: `Garantie endet ${label}`, en: `Warranty ends ${label}` }[locale],
                ]
              : [
                    ShieldXIcon,
                    'bg-rose-500/10 text-rose-700 dark:text-rose-400',
                    { de: `Garantie abgelaufen (${label})`, en: `Warranty expired (${label})` }[locale],
                ];
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', cls)} aria-label={ariaLabel}>
            <Icon className="size-3" />
            <span>{label}</span>
        </span>
    );
}

// --- Edit dialog ------------------------------------------------------------

type FormState = {
    itemId: string | null;
    categoryKey: GqlCAdminInventoryItemCategory;
    name: string;
    brand: string;
    model: string;
    serialNumber: string;
    purchasedAt: Date | undefined;
    purchasePriceEuros: string;
    condition: GqlCAdminInventoryItemCondition | 'none';
    warrantyEndsAt: Date | undefined;
    warrantyProvider: string;
    warrantyNotes: string;
    notes: string;
    // Carried through untouched so a plain field edit preserves the row's
    // disposal state — disposal is a field-set on the same upsert now.
    disposalState: GqlCAdminInventoryItemDisposalState;
    disposedAt: string | null;
};

function EditItemDialog({ initial, locale, onClose }: { initial: ItemRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<FormState>(() => ({
        itemId: initial?.itemId ?? null,
        categoryKey: initial?.categoryKey ?? 'electronics',
        name: initial?.name ?? '',
        brand: initial?.brand ?? '',
        model: initial?.model ?? '',
        serialNumber: initial?.serialNumber ?? '',
        purchasedAt: initial?.purchasedAt ? parseISO(initial.purchasedAt) : undefined,
        purchasePriceEuros: initial?.purchasePriceCents != null ? centsToEuros(initial.purchasePriceCents) : '',
        condition: initial?.condition ?? 'none',
        warrantyEndsAt: initial?.warrantyEndsAt ? parseISO(initial.warrantyEndsAt) : undefined,
        warrantyProvider: initial?.warrantyProvider ?? '',
        warrantyNotes: initial?.warrantyNotes ?? '',
        notes: initial?.notes ?? '',
        disposalState: initial?.disposalState ?? 'owned',
        disposedAt: initial?.disposedAt ?? null,
    }));
    const [, upsert] = useMutation(WorkspaceItemsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        const priceCents = eurosToCents(state.purchasePriceEuros);
        setSubmitting(true);
        try {
            const result = await upsert({
                items: [
                    {
                        itemId: state.itemId,
                        categoryKey: state.categoryKey,
                        name: state.name.trim(),
                        brand: state.brand.trim() || null,
                        model: state.model.trim() || null,
                        serialNumber: state.serialNumber.trim() || null,
                        purchasedAt: state.purchasedAt ? formatIsoDate(state.purchasedAt) : null,
                        purchasePriceCents: priceCents,
                        condition: state.condition === 'none' ? null : state.condition,
                        warrantyEndsAt: state.warrantyEndsAt ? formatIsoDate(state.warrantyEndsAt) : null,
                        warrantyProvider: state.warrantyProvider.trim() || null,
                        warrantyNotes: state.warrantyNotes.trim() || null,
                        notes: state.notes.trim() || null,
                        disposalState: state.disposalState,
                        disposedAt: state.disposedAt,
                    },
                ],
            });
            if (result.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Neuer Eintrag', en: 'New item' }[locale] : { de: 'Eintrag bearbeiten', en: 'Edit item' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Grunddaten und Garantie. Wert wird über „Neu bewerten“ auf der Detailseite gepflegt.',
                                en: 'Base facts and warranty. Value is edited via “Reprice” on the detail page.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required>
                        <Input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} autoFocus />
                    </Field>
                    <Field label={{ de: 'Kategorie', en: 'Category' }[locale]}>
                        <Select
                            value={state.categoryKey}
                            onValueChange={(v) => setState((s) => ({ ...s, categoryKey: v as GqlCAdminInventoryItemCategory }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_ORDER.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {CATEGORY_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Marke', en: 'Brand' }[locale]}>
                        <Input value={state.brand} onChange={(e) => setState((s) => ({ ...s, brand: e.target.value }))} />
                    </Field>
                    <Field label={{ de: 'Modell', en: 'Model' }[locale]}>
                        <Input value={state.model} onChange={(e) => setState((s) => ({ ...s, model: e.target.value }))} />
                    </Field>
                    <Field label={{ de: 'Seriennummer', en: 'Serial number' }[locale]}>
                        <Input value={state.serialNumber} onChange={(e) => setState((s) => ({ ...s, serialNumber: e.target.value }))} />
                    </Field>
                    <Field label={{ de: 'Zustand', en: 'Condition' }[locale]}>
                        <Select
                            value={state.condition}
                            onValueChange={(v) => setState((s) => ({ ...s, condition: v as GqlCAdminInventoryItemCondition | 'none' }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{{ de: '– keine Angabe –', en: '– unspecified –' }[locale]}</SelectItem>
                                {(Object.keys(CONDITION_LABELS) as GqlCAdminInventoryItemCondition[]).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {CONDITION_LABELS[key][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Kaufdatum', en: 'Purchase date' }[locale]}>
                        <DatePicker
                            value={state.purchasedAt}
                            onValueChange={(d) => setState((s) => ({ ...s, purchasedAt: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                        />
                    </Field>
                    <Field label={{ de: 'Kaufpreis (EUR)', en: 'Purchase price (EUR)' }[locale]}>
                        <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={state.purchasePriceEuros}
                            onChange={(e) => setState((s) => ({ ...s, purchasePriceEuros: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Garantie bis', en: 'Warranty ends' }[locale]}>
                        <DatePicker
                            value={state.warrantyEndsAt}
                            onValueChange={(d) => setState((s) => ({ ...s, warrantyEndsAt: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                        />
                    </Field>
                    <Field label={{ de: 'Garantiegeber', en: 'Warranty provider' }[locale]}>
                        <Input
                            value={state.warrantyProvider}
                            onChange={(e) => setState((s) => ({ ...s, warrantyProvider: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Garantiehinweise', en: 'Warranty notes' }[locale]} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={state.warrantyNotes}
                            onChange={(e) => setState((s) => ({ ...s, warrantyNotes: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || state.name.trim().length === 0}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({
    label,
    required,
    children,
    className,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
            <span className="text-xs font-medium text-muted-foreground">
                {label}
                {required ? <span className="text-destructive"> *</span> : null}
            </span>
            {children}
        </label>
    );
}

// --- Delete confirmation ----------------------------------------------------

function DeleteItemAlert({ item, locale, onClose }: { item: ItemRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceItemsDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ itemIds: [item.itemId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Eintrag löschen?', en: 'Delete this item?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${item.name}“ wird endgültig entfernt, inklusive Bewertungen, Serviceeinträgen und angehängten Dateien.`,
                                en: `"${item.name}" will be removed permanently, along with its valuations, service entries, and attached files.`,
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

// --- Empty state ------------------------------------------------------------

function EmptyState({ locale, filter, onNew }: { locale: Locale; filter: DisposalFilter; onNew: () => void }) {
    if (filter !== 'owned' && filter !== 'all') {
        return (
            <GlassCard className="px-6 py-10 text-center text-sm text-muted-foreground">
                {{ de: 'Keine Einträge in diesem Status.', en: 'No items in this status.' }[locale]}
            </GlassCard>
        );
    }
    return (
        <GlassCard className="px-6 py-10 text-center">
            <PackageIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch nichts erfasst', en: 'Nothing tracked yet' }[locale]}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {
                    {
                        de: 'Erfasse Kaffeemaschine, Auto, TV, Monitore und alles andere mit Kaufdatum, Garantie und aktuellem Wert.',
                        en: 'Track your coffee machine, car, TV, monitors, and anything else with purchase date, warranty, and current value.',
                    }[locale]
                }
            </p>
            <Button className="mt-4" onClick={onNew}>
                <PlusIcon className="size-4" />
                {{ de: 'Ersten Eintrag anlegen', en: 'Add the first item' }[locale]}
            </Button>
        </GlassCard>
    );
}

// --- Helpers ----------------------------------------------------------------

function warrantyState(endsAt: string | null | undefined): 'ok' | 'soon' | 'expired' | null {
    if (!endsAt) return null;
    const parsed = parseISO(endsAt).getTime();
    if (Number.isNaN(parsed)) return null;
    const now = Date.now();
    const days = (parsed - now) / (1000 * 60 * 60 * 24);
    if (days < 0) return 'expired';
    if (days < 90) return 'soon';
    return 'ok';
}

function centsToEuros(cents: number): string {
    return (cents / 100).toFixed(2);
}

function eurosToCents(input: string): number | null {
    const trimmed = input.trim().replace(',', '.');
    if (trimmed === '') return null;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) return null;
    return Math.round(parsed * 100);
}

// --- Live user hook ---------------------------------------------------------

// Seed-and-subscribe. Mirrors `useWorkspaceMediaPageLiveUser` — imperative
// URQL because the declarative hook can deliver each event more than once
// under concurrent React.
function useWorkspaceInventoryLiveUser(
    seed: GqlCWorkspaceInventoryPageUserFragment | null | undefined,
): GqlCWorkspaceInventoryPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceInventoryPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceInventoryPageUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client]);

    return user;
}
