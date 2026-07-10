import { createFileRoute, Link } from '@tanstack/react-router';
import {
    Building2Icon,
    CalendarClockIcon,
    CalendarRangeIcon,
    CarIcon,
    CircleDollarSignIcon,
    HeartPulseIcon,
    HomeIcon,
    LayersIcon,
    PencilIcon,
    PiggyBankIcon,
    PlusIcon,
    RepeatIcon,
    SparklesIcon,
    Trash2Icon,
    ZapIcon,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../web/components/base/dialog';
import { Input } from '../../../web/components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../web/components/base/select';
import { Switch } from '../../../web/components/base/switch';
import { Textarea } from '../../../web/components/base/textarea';
import { FinancesSankey } from '../../../web/components/FinancesSankey';
import type { FinancesSankeyInputLink, FinancesSankeyInputNode } from '../../../web/components/FinancesSankey';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCFinanceCadence,
    GqlCFinanceRecurringCostCategory,
    GqlCWorkspaceFinancesPageUpdatesSubscription,
    GqlCWorkspaceFinancesPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceFinanceMonthlyNetIncomeSetDocument,
    WorkspaceFinanceRecurringCostDeleteDocument,
    WorkspaceFinanceRecurringCostUpsertDocument,
    WorkspaceFinancesPageDocument,
    WorkspaceFinancesPageUpdatesDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's recurring costs — rent, insurance, subscriptions,
// transport, everything that leaves the account on a schedule. Same
// seed-and-subscribe posture as `/workspace/inventory`: the loader seeds,
// `userUpdates` swaps state on every server push, mutations never re-fetch.
// See `docs/features/workspace-finances.md`.

const title = { de: 'Finanzen', en: 'Finances' };
const description = { de: 'Laufende Kosten und ein Sankey deiner Ausgaben.', en: 'Recurring costs and a Sankey of where the money goes.' };

const CATEGORY_ORDER: ReadonlyArray<GqlCFinanceRecurringCostCategory> = [
    'housing',
    'utilities',
    'insurance',
    'transport',
    'subscriptions',
    'health',
    'finance',
    'other',
];
const CATEGORY_LABELS: Record<GqlCFinanceRecurringCostCategory, { de: string; en: string }> = {
    housing: { de: 'Wohnen', en: 'Housing' },
    utilities: { de: 'Nebenkosten', en: 'Utilities' },
    insurance: { de: 'Versicherungen', en: 'Insurance' },
    transport: { de: 'Verkehr', en: 'Transport' },
    subscriptions: { de: 'Abos', en: 'Subscriptions' },
    health: { de: 'Gesundheit', en: 'Health' },
    finance: { de: 'Finanzen', en: 'Finance' },
    other: { de: 'Sonstiges', en: 'Other' },
};
const CATEGORY_ICONS: Record<GqlCFinanceRecurringCostCategory, LucideIcon> = {
    housing: HomeIcon,
    utilities: ZapIcon,
    insurance: Building2Icon,
    transport: CarIcon,
    subscriptions: SparklesIcon,
    health: HeartPulseIcon,
    finance: PiggyBankIcon,
    other: LayersIcon,
};

const CADENCE_LABELS: Record<GqlCFinanceCadence, { de: string; en: string }> = {
    monthly: { de: 'monatlich', en: 'monthly' },
    yearly: { de: 'jährlich', en: 'yearly' },
};

type PeriodFilter = 'monthly' | 'yearly';
const PERIOD_FILTERS: ReadonlyArray<PeriodFilter> = ['monthly', 'yearly'];
const PERIOD_LABELS: Record<PeriodFilter, { de: string; en: string }> = {
    monthly: { de: 'Monatlich', en: 'Monthly' },
    yearly: { de: 'Jährlich', en: 'Yearly' },
};
const PERIOD_ICONS: Record<PeriodFilter, LucideIcon> = {
    monthly: CalendarClockIcon,
    yearly: CalendarRangeIcon,
};

const financesSearchSchema = z.object({
    period: z.enum(PERIOD_FILTERS).optional(),
});

type WorkspaceFinancesAdmin = NonNullable<GqlCWorkspaceFinancesPageUserFragment['admin']>;
type FinancesData = WorkspaceFinancesAdmin['adminFinancesFindOne'];
type CostRow = FinancesData['adminFinancesRecurringCostFindMany'][number];

export const Route = createFileRoute('/{-$locale}/workspace/finances')({
    validateSearch: financesSearchSchema,
    loader: () => routeLoaderGraphqlClient(WorkspaceFinancesPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: description[locale],
            path: '/workspace/finances',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: FinancesArea,
});

function FinancesArea() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const user = useWorkspaceFinancesLiveUser(data.sessionFindOne.user);
    const admin = user?.admin;
    const finances = admin?.adminFinancesFindOne;

    const period: PeriodFilter = search.period ?? 'monthly';
    const [editing, setEditing] = useState<CostRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<CostRow | null>(null);
    const [editingIncome, setEditingIncome] = useState(false);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!finances) return null;

    const activeCosts = finances.adminFinancesRecurringCostFindMany.filter((row) => row.active);

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <p className="text-sm text-muted-foreground">{description[locale]}</p>

            <OverviewStrip
                monthlyExpensesCents={finances.adminFinancesMonthlyExpensesCentsFindOne}
                yearlyExpensesCents={finances.adminFinancesYearlyExpensesCentsFindOne}
                monthlyNetIncomeCents={finances.adminFinancesMonthlyNetIncomeCentsFindOne}
                onEditIncome={() => setEditingIncome(true)}
                locale={locale}
            />

            <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-b border-border/60">
                <PeriodChips period={period} locale={locale} />
                <Button size="sm" onClick={() => setEditing('new')} className="mb-1">
                    <PlusIcon className="size-4" />
                    {{ de: 'Neue Position', en: 'New cost' }[locale]}
                </Button>
            </div>

            <section className="mt-6">
                <GlassCard className="p-4 md:p-6">
                    <SankeyView
                        costs={activeCosts}
                        period={period}
                        monthlyNetIncomeCents={finances.adminFinancesMonthlyNetIncomeCentsFindOne}
                        locale={locale}
                    />
                </GlassCard>
            </section>

            <div className="mt-10">
                {finances.adminFinancesRecurringCostFindMany.length === 0 ? (
                    <EmptyState locale={locale} onNew={() => setEditing('new')} />
                ) : (
                    <GroupedList
                        costs={finances.adminFinancesRecurringCostFindMany}
                        period={period}
                        locale={locale}
                        onEdit={setEditing}
                        onDelete={setDeleting}
                    />
                )}
            </div>

            {editing !== null ? (
                <EditCostDialog initial={editing === 'new' ? null : editing} locale={locale} onClose={() => setEditing(null)} />
            ) : null}
            {deleting !== null ? <DeleteCostAlert cost={deleting} locale={locale} onClose={() => setDeleting(null)} /> : null}
            {editingIncome ? (
                <EditIncomeDialog
                    initialCents={finances.adminFinancesMonthlyNetIncomeCentsFindOne ?? null}
                    locale={locale}
                    onClose={() => setEditingIncome(false)}
                />
            ) : null}
        </main>
    );
}

// --- Overview strip ---------------------------------------------------------

function OverviewStrip({
    monthlyExpensesCents,
    yearlyExpensesCents,
    monthlyNetIncomeCents,
    onEditIncome,
    locale,
}: {
    monthlyExpensesCents: number;
    yearlyExpensesCents: number;
    monthlyNetIncomeCents: number | null | undefined;
    onEditIncome: () => void;
    locale: Locale;
}) {
    const leftoverCents = monthlyNetIncomeCents != null ? monthlyNetIncomeCents - monthlyExpensesCents : null;
    return (
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{{ de: 'Pro Monat', en: 'Per month' }[locale]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(monthlyExpensesCents, locale)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {{ de: 'Summe aller aktiven Positionen', en: 'Sum of every active cost' }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{{ de: 'Pro Jahr', en: 'Per year' }[locale]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(yearlyExpensesCents, locale)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    {{ de: '12 Monate hochgerechnet', en: '12-month projection' }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {{ de: 'Nettoeinkommen', en: 'Net income' }[locale]}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 -mt-1 -mr-1"
                        onClick={onEditIncome}
                        aria-label={{ de: 'Nettoeinkommen bearbeiten', en: 'Edit net income' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {monthlyNetIncomeCents != null ? (
                        formatCurrency(monthlyNetIncomeCents, locale)
                    ) : (
                        <span className="text-muted-foreground text-base font-normal">
                            {{ de: 'Nicht gesetzt', en: 'Not set' }[locale]}
                        </span>
                    )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {leftoverCents == null
                        ? { de: 'Setze dein Nettogehalt für einen Puffer.', en: 'Set your net salary to see leftover.' }[locale]
                        : leftoverCents >= 0
                          ? {
                                de: `${formatCurrency(leftoverCents, locale)} übrig`,
                                en: `${formatCurrency(leftoverCents, locale)} leftover`,
                            }[locale]
                          : {
                                de: `${formatCurrency(-leftoverCents, locale)} über dem Einkommen`,
                                en: `${formatCurrency(-leftoverCents, locale)} over income`,
                            }[locale]}
                </div>
            </GlassCard>
        </section>
    );
}

// --- Period switcher --------------------------------------------------------

// Canonical top-of-page sub-view switcher — underlined section tabs.
// See `docs/conventions.md` — "Top-of-page sub-view switcher".
function PeriodChips({ period, locale }: { period: PeriodFilter; locale: Locale }) {
    return (
        <nav className="flex gap-1 overflow-x-auto no-scrollbar scroll-fade-x" aria-label={{ de: 'Zeitraum', en: 'Period' }[locale]}>
            {PERIOD_FILTERS.map((key) => {
                const isActive = period === key;
                const Icon = PERIOD_ICONS[key];
                return (
                    <Link
                        key={key}
                        to="/{-$locale}/workspace/finances"
                        from="/{-$locale}/workspace/finances"
                        // `monthly` is the default — drop it from the URL.
                        search={(prev) => ({ ...prev, period: key === 'monthly' ? undefined : key })}
                        replace
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <Icon className="size-4" />
                        {PERIOD_LABELS[key][locale]}
                    </Link>
                );
            })}
        </nav>
    );
}

// --- Sankey view -----------------------------------------------------------

function SankeyView({
    costs,
    period,
    monthlyNetIncomeCents,
    locale,
}: {
    costs: ReadonlyArray<CostRow>;
    period: PeriodFilter;
    monthlyNetIncomeCents: number | null | undefined;
    locale: Locale;
}) {
    const { nodes, links, totalCents } = useMemo(
        () => buildSankey(costs, period, monthlyNetIncomeCents, locale),
        [costs, period, monthlyNetIncomeCents, locale],
    );

    if (costs.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {
                    {
                        de: 'Noch keine aktiven Positionen — die Übersicht erscheint, sobald du etwas anlegst.',
                        en: 'No active costs yet — the chart appears as soon as you add one.',
                    }[locale]
                }
            </p>
        );
    }

    const ariaLabel = {
        de: `Sankey-Diagramm der Ausgaben (${PERIOD_LABELS[period].de.toLowerCase()}): ${formatCurrency(totalCents, locale)} verteilt auf ${costs.length} Positionen.`,
        en: `Sankey diagram of expenses (${PERIOD_LABELS[period].en.toLowerCase()}): ${formatCurrency(totalCents, locale)} across ${costs.length} costs.`,
    }[locale];

    return <FinancesSankey nodes={nodes} links={links} locale={locale} ariaLabel={ariaLabel} />;
}

// --- Grouped list -----------------------------------------------------------

function GroupedList({
    costs,
    period,
    locale,
    onEdit,
    onDelete,
}: {
    costs: ReadonlyArray<CostRow>;
    period: PeriodFilter;
    locale: Locale;
    onEdit: (cost: CostRow) => void;
    onDelete: (cost: CostRow) => void;
}) {
    const groups = useMemo(() => {
        const byCategory = new Map<GqlCFinanceRecurringCostCategory, CostRow[]>();
        for (const row of costs) {
            const list = byCategory.get(row.categoryKey) ?? [];
            list.push(row);
            byCategory.set(row.categoryKey, list);
        }
        return CATEGORY_ORDER.flatMap((key) => {
            const list = byCategory.get(key);
            if (!list || list.length === 0) return [];
            const total = list.filter((r) => r.active).reduce((sum, r) => sum + projectedCents(r, period), 0);
            return [{ key, costs: list, total }];
        });
    }, [costs, period]);

    return (
        <div className="space-y-8">
            {groups.map((group) => {
                const Icon = CATEGORY_ICONS[group.key];
                return (
                    <section key={group.key} aria-labelledby={`finances-cat-${group.key}`}>
                        <div className="mb-3 flex items-baseline justify-between gap-3">
                            <h2
                                id={`finances-cat-${group.key}`}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider"
                            >
                                <Icon className="size-4" aria-hidden />
                                {CATEGORY_LABELS[group.key][locale]}
                                <span className="text-xs normal-case tracking-normal">
                                    {{ de: `${group.costs.length} Positionen`, en: `${group.costs.length} costs` }[locale]}
                                </span>
                            </h2>
                            <div className="text-xs tabular-nums text-muted-foreground">
                                {formatCurrency(group.total, locale)} · {PERIOD_LABELS[period][locale].toLowerCase()}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {group.costs.map((cost) => (
                                <CostCard
                                    key={cost.costId}
                                    cost={cost}
                                    period={period}
                                    locale={locale}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function CostCard({
    cost,
    period,
    locale,
    onEdit,
    onDelete,
}: {
    cost: CostRow;
    period: PeriodFilter;
    locale: Locale;
    onEdit: (cost: CostRow) => void;
    onDelete: (cost: CostRow) => void;
}) {
    const projected = projectedCents(cost, period);
    return (
        <GlassCard className={cn('group px-4 py-4', !cost.active && 'opacity-60')}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-base font-semibold truncate">
                        <span className="truncate">{cost.name}</span>
                        {!cost.active ? (
                            <span className="shrink-0 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {{ de: 'Pausiert', en: 'Paused' }[locale]}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <RepeatIcon className="size-3" aria-hidden />
                        <span>
                            {formatCurrency(cost.amountCents, locale)} · {CADENCE_LABELS[cost.cadence][locale]}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(cost)}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => onDelete(cost)}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
                {cost.notes ? (
                    <div className="text-xs text-muted-foreground line-clamp-2">{cost.notes}</div>
                ) : (
                    <div className="text-xs text-muted-foreground/60">&nbsp;</div>
                )}
                <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{formatCurrency(projected, locale)}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{PERIOD_LABELS[period][locale].toLowerCase()}</div>
                </div>
            </div>
        </GlassCard>
    );
}

// --- Edit dialog ------------------------------------------------------------

type FormState = {
    costId: string | null;
    name: string;
    categoryKey: GqlCFinanceRecurringCostCategory;
    amountEuros: string;
    cadence: GqlCFinanceCadence;
    notes: string;
    active: boolean;
};

function EditCostDialog({ initial, locale, onClose }: { initial: CostRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<FormState>(() => ({
        costId: initial?.costId ?? null,
        name: initial?.name ?? '',
        categoryKey: initial?.categoryKey ?? 'subscriptions',
        amountEuros: initial?.amountCents != null ? centsToEuros(initial.amountCents) : '',
        cadence: initial?.cadence ?? 'monthly',
        notes: initial?.notes ?? '',
        active: initial?.active ?? true,
    }));
    const [, upsert] = useMutation(WorkspaceFinanceRecurringCostUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const amountCents = eurosToCents(state.amountEuros);
    const canSave = state.name.trim().length > 0 && amountCents != null && amountCents > 0;

    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                financeRecurringCosts: [
                    {
                        costId: state.costId,
                        name: state.name.trim(),
                        categoryKey: state.categoryKey,
                        amountCents: amountCents,
                        cadence: state.cadence,
                        notes: state.notes.trim() || null,
                        active: state.active,
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
                        {isNew ? { de: 'Neue Position', en: 'New cost' }[locale] : { de: 'Position bearbeiten', en: 'Edit cost' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Betrag pro Turnus. „Monatlich“ ist der Betrag jeden Monat, „Jährlich“ ist der Betrag einmal pro Jahr.',
                                en: 'Amount per cadence. "Monthly" means the amount every month; "Yearly" means the amount once per year.',
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
                            onValueChange={(v) => setState((s) => ({ ...s, categoryKey: v as GqlCFinanceRecurringCostCategory }))}
                        >
                            <SelectTrigger>
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
                    <Field label={{ de: 'Betrag (EUR)', en: 'Amount (EUR)' }[locale]} required>
                        <Input
                            inputMode="decimal"
                            placeholder="0.00"
                            value={state.amountEuros}
                            onChange={(e) => setState((s) => ({ ...s, amountEuros: e.target.value }))}
                        />
                    </Field>
                    <Field label={{ de: 'Turnus', en: 'Cadence' }[locale]}>
                        <Select value={state.cadence} onValueChange={(v) => setState((s) => ({ ...s, cadence: v as GqlCFinanceCadence }))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">{CADENCE_LABELS.monthly[locale]}</SelectItem>
                                <SelectItem value="yearly">{CADENCE_LABELS.yearly[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Notizen', en: 'Notes' }[locale]} className="sm:col-span-2">
                        <Textarea rows={3} value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} />
                    </Field>
                    <label className="flex items-center gap-3 text-sm sm:col-span-2">
                        <Switch checked={state.active} onCheckedChange={(v) => setState((s) => ({ ...s, active: v }))} />
                        <span>
                            <span className="font-medium">{{ de: 'Aktiv', en: 'Active' }[locale]}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                                {{ de: 'Zählt in Übersicht und Sankey', en: 'Counts toward the totals and the Sankey' }[locale]}
                            </span>
                        </span>
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={submitting}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button onClick={submit} disabled={submitting || !canSave}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditIncomeDialog({ initialCents, locale, onClose }: { initialCents: number | null; locale: Locale; onClose: () => void }) {
    const [euros, setEuros] = useState(initialCents != null ? centsToEuros(initialCents) : '');
    const [, setIncome] = useMutation(WorkspaceFinanceMonthlyNetIncomeSetDocument);
    const [submitting, setSubmitting] = useState(false);

    const submit = async (clear: boolean) => {
        setSubmitting(true);
        try {
            const cents = clear ? null : eurosToCents(euros);
            const result = await setIncome({ amountCents: cents });
            if (result.error) return;
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Nettoeinkommen', en: 'Net income' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Monatliches Nettogehalt — Basis für den „übrig“-Wert und der linke Knoten im Sankey.',
                                en: 'Monthly net salary — basis for the leftover number and the left node in the Sankey.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <Field label={{ de: 'Betrag (EUR)', en: 'Amount (EUR)' }[locale]}>
                    <Input inputMode="decimal" placeholder="0.00" value={euros} onChange={(e) => setEuros(e.target.value)} autoFocus />
                </Field>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => submit(true)} disabled={submitting}>
                        {{ de: 'Löschen', en: 'Clear' }[locale]}
                    </Button>
                    <Button onClick={() => submit(false)} disabled={submitting || eurosToCents(euros) == null}>
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

function DeleteCostAlert({ cost, locale, onClose }: { cost: CostRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceFinanceRecurringCostDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ costIds: [cost.costId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Position löschen?', en: 'Delete this cost?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${cost.name}“ wird endgültig entfernt. Alternativ kannst du sie über „Aktiv“ pausieren, damit sie in der Historie bleibt.`,
                                en: `"${cost.name}" will be removed permanently. As an alternative, uncheck "Active" to keep it in the history.`,
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

function EmptyState({ locale, onNew }: { locale: Locale; onNew: () => void }) {
    return (
        <GlassCard className="px-6 py-10 text-center">
            <CircleDollarSignIcon className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <h2 className="mt-3 text-base font-semibold">{{ de: 'Noch keine Positionen', en: 'Nothing tracked yet' }[locale]}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {
                    {
                        de: 'Erfasse Miete, Nebenkosten, Versicherungen, Abos und ähnliches — mit Betrag und Turnus. Der Rest kommt automatisch.',
                        en: 'Track rent, utilities, insurance, subscriptions, and the like — with an amount and a cadence. The rest is automatic.',
                    }[locale]
                }
            </p>
            <Button className="mt-4" onClick={onNew}>
                <PlusIcon className="size-4" />
                {{ de: 'Erste Position anlegen', en: 'Add the first cost' }[locale]}
            </Button>
        </GlassCard>
    );
}

// --- Helpers ----------------------------------------------------------------

// Project a row's cents amount into the requested period.
// `amountCents` on the row is per its own `cadence`.
function projectedCents(row: CostRow, period: PeriodFilter): number {
    if (row.cadence === period) return row.amountCents;
    if (period === 'monthly') return Math.round(row.amountCents / 12);
    return row.amountCents * 12;
}

function buildSankey(
    costs: ReadonlyArray<CostRow>,
    period: PeriodFilter,
    monthlyNetIncomeCents: number | null | undefined,
    locale: Locale,
): { nodes: FinancesSankeyInputNode[]; links: FinancesSankeyInputLink[]; totalCents: number } {
    const nodes: FinancesSankeyInputNode[] = [];
    const links: FinancesSankeyInputLink[] = [];

    if (costs.length === 0) return { nodes, links, totalCents: 0 };

    const totalCents = costs.reduce((sum, row) => sum + projectedCents(row, period), 0);
    const incomeCents = monthlyNetIncomeCents != null && period === 'yearly' ? monthlyNetIncomeCents * 12 : (monthlyNetIncomeCents ?? null);

    const incomeId = 'income';
    nodes.push({
        id: incomeId,
        kind: 'income',
        label: incomeCents != null ? { de: 'Nettoeinkommen', en: 'Net income' }[locale] : { de: 'Ausgaben', en: 'Expenses' }[locale],
        sublabel: incomeCents != null ? formatCurrency(incomeCents, locale) : formatCurrency(totalCents, locale),
    });

    const byCategory = new Map<GqlCFinanceRecurringCostCategory, { total: number; rows: CostRow[] }>();
    for (const row of costs) {
        const entry = byCategory.get(row.categoryKey) ?? { total: 0, rows: [] };
        entry.total += projectedCents(row, period);
        entry.rows.push(row);
        byCategory.set(row.categoryKey, entry);
    }

    for (const key of CATEGORY_ORDER) {
        const entry = byCategory.get(key);
        if (!entry || entry.total <= 0) continue;
        const categoryId = `category:${key}`;
        nodes.push({
            id: categoryId,
            kind: 'category',
            label: CATEGORY_LABELS[key][locale],
            sublabel: formatCurrency(entry.total, locale),
        });
        links.push({ source: incomeId, target: categoryId, valueCents: entry.total });
        for (const row of entry.rows) {
            const itemId = `item:${row.costId}`;
            nodes.push({ id: itemId, kind: 'item', label: row.name, sublabel: formatCurrency(projectedCents(row, period), locale) });
            links.push({ source: categoryId, target: itemId, valueCents: projectedCents(row, period) });
        }
    }

    return { nodes, links, totalCents };
}

function formatCurrency(cents: number | null | undefined, locale: Locale): string {
    const value = (cents ?? 0) / 100;
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(value);
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

// Seed-and-subscribe. Mirrors `useWorkspaceInventoryLiveUser` — imperative
// URQL because the declarative hook can deliver each event more than once
// under concurrent React.
function useWorkspaceFinancesLiveUser(
    seed: GqlCWorkspaceFinancesPageUserFragment | null | undefined,
): GqlCWorkspaceFinancesPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceFinancesPageUpdatesDocument, {});
        const operation = client.executeSubscription<GqlCWorkspaceFinancesPageUpdatesSubscription>(request);
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
