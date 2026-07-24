import { createFileRoute, Link } from '@tanstack/react-router';
import { parseISO } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
    Building2Icon,
    CalendarClockIcon,
    CalendarDaysIcon,
    CalendarRangeIcon,
    CarIcon,
    CircleDollarSignIcon,
    CloudIcon,
    CodeIcon,
    DumbbellIcon,
    HandHeartIcon,
    HeartHandshakeIcon,
    HomeIcon,
    LandmarkIcon,
    LayersIcon,
    LayoutDashboardIcon,
    LineChartIcon,
    PackageIcon,
    PencilIcon,
    PiggyBankIcon,
    PlaneIcon,
    PlusIcon,
    RefreshCwIcon,
    RepeatIcon,
    ScissorsIcon,
    SmartphoneIcon,
    SparklesIcon,
    Trash2Icon,
    WalletIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { formatCurrency, formatDateRange, formatIsoDate } from '../../../shared';
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
import { Switch } from '../../../web/components/base/switch';
import { Textarea } from '../../../web/components/base/textarea';
import type { FinancesSankeyColor, FinancesSankeyInputLink, FinancesSankeyInputNode } from '../../../web/components/FinancesSankey';
import { FinancesSankey } from '../../../web/components/FinancesSankey';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCAdminFinancesAssetKind,
    GqlCAdminFinancesCadence,
    GqlCAdminFinancesRecurringCostCategory,
    GqlCWorkspaceFinancesPageUpdatesSubscription,
    GqlCWorkspaceFinancesPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceFinancesAssetsDeleteDocument,
    WorkspaceFinancesAssetsRepriceDocument,
    WorkspaceFinancesAssetsUpsertDocument,
    WorkspaceFinancesIncomeStreamsDeleteDocument,
    WorkspaceFinancesIncomeStreamsUpsertDocument,
    WorkspaceFinancesPageDocument,
    WorkspaceFinancesPageUpdatesDocument,
    WorkspaceFinancesRecurringCostsDeleteDocument,
    WorkspaceFinancesRecurringCostsUpsertDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Admin editor for Cem's cashflow (income + recurring costs + Sankey) and
// wealth (asset-first positions with a location label). Same seed-and-subscribe
// posture as `/workspace/inventory`: the loader seeds, `userUpdates` swaps
// state on every server push, mutations never re-fetch. See
// `docs/features/workspace-finances.md`.

const title = { de: 'Finanzen', en: 'Finances' };
const description = {
    de: 'Vermögen, Einkommen, laufende Kosten und ein Sankey deiner Ausgaben.',
    en: 'Net worth, income, recurring costs, and a Sankey of where the money goes.',
};

const CATEGORY_LABELS: Record<GqlCAdminFinancesRecurringCostCategory, { de: string; en: string }> = {
    housing: { de: 'Wohnen', en: 'Housing' },
    connectivity: { de: 'Kommunikation', en: 'Connectivity' },
    transport: { de: 'Verkehr', en: 'Transport' },
    insurance: { de: 'Versicherungen', en: 'Insurance' },
    entertainment: { de: 'Unterhaltung', en: 'Entertainment' },
    cloud: { de: 'Cloud', en: 'Cloud' },
    work: { de: 'Arbeit', en: 'Work' },
    sport: { de: 'Sport', en: 'Sport' },
    personalCare: { de: 'Körperpflege', en: 'Personal care' },
    donations: { de: 'Spenden', en: 'Donations' },
    household: { de: 'Haushalt', en: 'Household' },
    savingsGeneral: { de: 'Sparen (Allgemein)', en: 'Savings (General)' },
    savingsVacation: { de: 'Sparen (Urlaub)', en: 'Savings (Vacation)' },
    other: { de: 'Sonstiges', en: 'Other' },
};
const CATEGORY_ICONS: Record<GqlCAdminFinancesRecurringCostCategory, LucideIcon> = {
    housing: HomeIcon,
    connectivity: SmartphoneIcon,
    transport: CarIcon,
    insurance: Building2Icon,
    entertainment: SparklesIcon,
    cloud: CloudIcon,
    work: CodeIcon,
    sport: DumbbellIcon,
    personalCare: ScissorsIcon,
    donations: HandHeartIcon,
    household: HeartHandshakeIcon,
    savingsGeneral: PiggyBankIcon,
    savingsVacation: PlaneIcon,
    other: LayersIcon,
};

/** Alphabetical by locale label; `other` always last (select options + list sections). */
function categoryOrderForLocale(locale: Locale): ReadonlyArray<GqlCAdminFinancesRecurringCostCategory> {
    return [
        ...(Object.keys(CATEGORY_LABELS) as GqlCAdminFinancesRecurringCostCategory[])
            .filter((key) => key !== 'other')
            .sort((a, b) => CATEGORY_LABELS[a][locale].localeCompare(CATEGORY_LABELS[b][locale], locale)),
        'other',
    ];
}

const CADENCE_LABELS: Record<GqlCAdminFinancesCadence, { de: string; en: string }> = {
    monthly: { de: 'monatlich', en: 'monthly' },
    quarterly: { de: 'quartalsweise', en: 'quarterly' },
    yearly: { de: 'jährlich', en: 'yearly' },
};

type PeriodFilter = GqlCAdminFinancesCadence;
const PERIOD_FILTERS: ReadonlyArray<PeriodFilter> = ['monthly', 'quarterly', 'yearly'];
const PERIOD_LABELS: Record<PeriodFilter, { de: string; en: string }> = {
    monthly: { de: 'Monatlich', en: 'Monthly' },
    quarterly: { de: 'Quartalsweise', en: 'Quarterly' },
    yearly: { de: 'Jährlich', en: 'Yearly' },
};
const PERIOD_ICONS: Record<PeriodFilter, LucideIcon> = {
    monthly: CalendarClockIcon,
    quarterly: CalendarDaysIcon,
    yearly: CalendarRangeIcon,
};

type Tab = 'overview' | 'cashflow' | 'wealth';
const TABS: ReadonlyArray<Tab> = ['overview', 'cashflow', 'wealth'];
const TAB_LABELS: Record<Tab, { de: string; en: string }> = {
    overview: { de: 'Überblick', en: 'Overview' },
    cashflow: { de: 'Cashflow', en: 'Cashflow' },
    wealth: { de: 'Vermögen', en: 'Wealth' },
};
const TAB_ICONS: Record<Tab, LucideIcon> = {
    overview: LayoutDashboardIcon,
    cashflow: WalletIcon,
    wealth: LandmarkIcon,
};

const ASSET_KIND_ORDER: ReadonlyArray<GqlCAdminFinancesAssetKind> = ['cash', 'security', 'bauspar'];
const ASSET_KIND_LABELS: Record<GqlCAdminFinancesAssetKind, { de: string; en: string }> = {
    cash: { de: 'Liquidität', en: 'Liquid cash' },
    security: { de: 'Investments', en: 'Investments' },
    bauspar: { de: 'Bauspar', en: 'Bauspar' },
};
const ASSET_KIND_ICONS: Record<GqlCAdminFinancesAssetKind, LucideIcon> = {
    cash: PiggyBankIcon,
    security: LineChartIcon,
    bauspar: HomeIcon,
};

const financesSearchSchema = z.object({
    tab: z.enum(TABS).optional(),
    period: z.enum(PERIOD_FILTERS).optional(),
});

type WorkspaceFinancesAdmin = NonNullable<GqlCWorkspaceFinancesPageUserFragment['admin']>;
type FinancesData = WorkspaceFinancesAdmin['adminFinancesFindOne'];
type CostRow = FinancesData['adminFinancesRecurringCostFindMany'][number];
type IncomeRow = FinancesData['adminFinancesIncomeStreamFindMany'][number];
type AssetRow = FinancesData['adminFinancesAssetFindMany'][number];

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
    const inventory = admin?.adminInventoryFindOne;

    const tab: Tab = search.tab ?? 'overview';
    const period: PeriodFilter = search.period ?? 'monthly';
    const [editingCost, setEditingCost] = useState<CostRow | 'new' | null>(null);
    const [deletingCost, setDeletingCost] = useState<CostRow | null>(null);
    const [editingIncome, setEditingIncome] = useState<IncomeRow | 'new' | null>(null);
    const [deletingIncome, setDeletingIncome] = useState<IncomeRow | null>(null);
    const [editingAsset, setEditingAsset] = useState<AssetRow | 'new' | null>(null);
    const [repricingAsset, setRepricingAsset] = useState<AssetRow | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<AssetRow | null>(null);

    if (!admin) return <WorkspaceUnauthorized locale={locale} />;
    if (!finances) return null;

    const activeCosts = finances.adminFinancesRecurringCostFindMany.filter((row) => row.active);
    const incomeCents =
        period === 'yearly'
            ? finances.adminFinancesYearlyIncomeCentsFindOne
            : period === 'quarterly'
              ? finances.adminFinancesQuarterlyIncomeCentsFindOne
              : finances.adminFinancesMonthlyIncomeCentsFindOne;
    const expensesCents =
        period === 'yearly'
            ? finances.adminFinancesYearlyExpensesCentsFindOne
            : period === 'quarterly'
              ? finances.adminFinancesQuarterlyExpensesCentsFindOne
              : finances.adminFinancesMonthlyExpensesCentsFindOne;
    const materialNetWorthCents = inventory?.adminInventoryMaterialNetWorthCentsFindOne ?? 0;
    const totalNetWorthCents = finances.adminFinancesFinancialNetWorthCentsFindOne + materialNetWorthCents;

    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full py-12 leading-relaxed">
            <div className="border-b border-border/60">
                <TabChips tab={tab} locale={locale} />
            </div>

            {tab === 'overview' ? (
                <OverviewTab
                    finances={finances}
                    materialNetWorthCents={materialNetWorthCents}
                    totalNetWorthCents={totalNetWorthCents}
                    monthlyIncomeCents={finances.adminFinancesMonthlyIncomeCentsFindOne}
                    monthlyExpensesCents={finances.adminFinancesMonthlyExpensesCentsFindOne}
                    locale={locale}
                />
            ) : null}

            {tab === 'cashflow' ? (
                <>
                    <div className="mt-6 border-b border-border/60">
                        <PeriodChips period={period} locale={locale} />
                    </div>

                    <PeriodSummary incomeCents={incomeCents} expensesCents={expensesCents} locale={locale} />

                    <section className="mt-6">
                        <GlassCard className="p-4 md:p-6">
                            <SankeyView costs={activeCosts} period={period} incomeCents={incomeCents} locale={locale} />
                        </GlassCard>
                    </section>

                    <IncomeStreamsSection
                        streams={finances.adminFinancesIncomeStreamFindMany}
                        period={period}
                        locale={locale}
                        onNew={() => setEditingIncome('new')}
                        onEdit={setEditingIncome}
                        onDelete={setDeletingIncome}
                    />

                    <RecurringCostsSection
                        costs={finances.adminFinancesRecurringCostFindMany}
                        period={period}
                        locale={locale}
                        onNew={() => setEditingCost('new')}
                        onEdit={setEditingCost}
                        onDelete={setDeletingCost}
                    />
                </>
            ) : null}

            {tab === 'wealth' ? (
                <WealthTab
                    assets={finances.adminFinancesAssetFindMany}
                    locale={locale}
                    onNew={() => setEditingAsset('new')}
                    onEdit={setEditingAsset}
                    onReprice={setRepricingAsset}
                    onDelete={setDeletingAsset}
                />
            ) : null}

            {editingCost !== null ? (
                <EditCostDialog initial={editingCost === 'new' ? null : editingCost} locale={locale} onClose={() => setEditingCost(null)} />
            ) : null}
            {deletingCost !== null ? <DeleteCostAlert cost={deletingCost} locale={locale} onClose={() => setDeletingCost(null)} /> : null}
            {editingIncome !== null ? (
                <EditIncomeDialog
                    initial={editingIncome === 'new' ? null : editingIncome}
                    locale={locale}
                    onClose={() => setEditingIncome(null)}
                />
            ) : null}
            {deletingIncome !== null ? (
                <DeleteIncomeAlert stream={deletingIncome} locale={locale} onClose={() => setDeletingIncome(null)} />
            ) : null}
            {editingAsset !== null ? (
                <EditAssetDialog
                    initial={editingAsset === 'new' ? null : editingAsset}
                    knownLocations={distinctLocations(finances.adminFinancesAssetFindMany)}
                    locale={locale}
                    onClose={() => setEditingAsset(null)}
                />
            ) : null}
            {repricingAsset !== null ? (
                <RepriceAssetDialog asset={repricingAsset} locale={locale} onClose={() => setRepricingAsset(null)} />
            ) : null}
            {deletingAsset !== null ? (
                <DeleteAssetAlert asset={deletingAsset} locale={locale} onClose={() => setDeletingAsset(null)} />
            ) : null}
        </main>
    );
}

function distinctLocations(assets: readonly AssetRow[]): string[] {
    return [...new Set(assets.map((a) => a.location).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// --- Top-level tabs ---------------------------------------------------------

function TabChips({ tab, locale }: { tab: Tab; locale: Locale }) {
    return (
        <nav
            className="flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-fade-x"
            aria-label={{ de: 'Bereich', en: 'Section' }[locale]}
        >
            {TABS.map((key) => {
                const isActive = tab === key;
                const Icon = TAB_ICONS[key];
                return (
                    <Link
                        key={key}
                        to="/{-$locale}/workspace/finances"
                        from="/{-$locale}/workspace/finances"
                        search={(prev) => ({ ...prev, tab: key === 'overview' ? undefined : key })}
                        replace
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <Icon className="size-4" />
                        {TAB_LABELS[key][locale]}
                    </Link>
                );
            })}
        </nav>
    );
}

// --- Overview ---------------------------------------------------------------

function OverviewTab({
    finances,
    materialNetWorthCents,
    totalNetWorthCents,
    monthlyIncomeCents,
    monthlyExpensesCents,
    locale,
}: {
    finances: FinancesData;
    materialNetWorthCents: number;
    totalNetWorthCents: number;
    monthlyIncomeCents: number;
    monthlyExpensesCents: number;
    locale: Locale;
}) {
    const leftoverCents = monthlyIncomeCents - monthlyExpensesCents;
    const tiles: Array<{ label: string; valueCents: number; hint?: string; icon: LucideIcon }> = [
        {
            label: { de: 'Gesamtvermögen', en: 'Total net worth' }[locale],
            valueCents: totalNetWorthCents,
            hint: { de: 'Finanziell + materiell', en: 'Financial + material' }[locale],
            icon: LandmarkIcon,
        },
        {
            label: { de: 'Liquidität', en: 'Liquid cash' }[locale],
            valueCents: finances.adminFinancesLiquidCentsFindOne,
            icon: PiggyBankIcon,
        },
        {
            label: { de: 'Investments', en: 'Investments' }[locale],
            valueCents: finances.adminFinancesInvestedCentsFindOne,
            icon: LineChartIcon,
        },
        {
            label: { de: 'Bauspar', en: 'Bauspar' }[locale],
            valueCents: finances.adminFinancesBausparCentsFindOne,
            icon: HomeIcon,
        },
        {
            label: { de: 'Inventar', en: 'Inventory' }[locale],
            valueCents: materialNetWorthCents,
            hint: { de: 'Materielle Güter', en: 'Material belongings' }[locale],
            icon: PackageIcon,
        },
    ];

    return (
        <>
            <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                        <GlassCard key={tile.label} className="px-5 py-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-foreground/60">
                                <Icon className="size-3.5" />
                                {tile.label}
                            </div>
                            <div className="mt-1 text-2xl font-semibold tabular-nums">
                                {formatCurrency(tile.valueCents, { locale, maximumFractionDigits: 0 })}
                            </div>
                            {tile.hint ? <div className="mt-1 text-xs text-foreground/65">{tile.hint}</div> : null}
                        </GlassCard>
                    );
                })}
            </section>

            <GlassCard className="mt-6 px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-foreground/60">
                    {{ de: 'Monatlicher Cashflow', en: 'Monthly cashflow' }[locale]}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
                    <span>
                        {{ de: 'Einkommen', en: 'Income' }[locale]}:{' '}
                        <strong>{formatCurrency(monthlyIncomeCents, { locale, maximumFractionDigits: 0 })}</strong>
                    </span>
                    <span>
                        {{ de: 'Zahlungen', en: 'Payments' }[locale]}:{' '}
                        <strong>{formatCurrency(monthlyExpensesCents, { locale, maximumFractionDigits: 0 })}</strong>
                    </span>
                    <span className={leftoverCents >= 0 ? 'text-foreground' : 'text-destructive'}>
                        {leftoverCents >= 0
                            ? {
                                  de: `${formatCurrency(leftoverCents, { locale, maximumFractionDigits: 0 })} übrig`,
                                  en: `${formatCurrency(leftoverCents, { locale, maximumFractionDigits: 0 })} leftover`,
                              }[locale]
                            : {
                                  de: `${formatCurrency(-leftoverCents, { locale, maximumFractionDigits: 0 })} über dem Einkommen`,
                                  en: `${formatCurrency(-leftoverCents, { locale, maximumFractionDigits: 0 })} over income`,
                              }[locale]}
                    </span>
                </div>
                <div className="mt-3">
                    <Link
                        to="/{-$locale}/workspace/finances"
                        from="/{-$locale}/workspace/finances"
                        search={(prev) => ({ ...prev, tab: 'cashflow' })}
                        className="text-sm text-primary hover:underline"
                    >
                        {{ de: 'Zum Cashflow →', en: 'Go to cashflow →' }[locale]}
                    </Link>
                    <span className="mx-2 text-foreground/30">·</span>
                    <Link to="/{-$locale}/workspace/inventory" className="text-sm text-primary hover:underline">
                        {{ de: 'Zum Inventar →', en: 'Go to inventory →' }[locale]}
                    </Link>
                </div>
            </GlassCard>
        </>
    );
}

// --- Wealth -----------------------------------------------------------------

function WealthTab({
    assets,
    locale,
    onNew,
    onEdit,
    onReprice,
    onDelete,
}: {
    assets: readonly AssetRow[];
    locale: Locale;
    onNew: () => void;
    onEdit: (asset: AssetRow) => void;
    onReprice: (asset: AssetRow) => void;
    onDelete: (asset: AssetRow) => void;
}) {
    const grouped = useMemo(() => {
        return ASSET_KIND_ORDER.map((kind) => {
            const list = assets.filter((a) => a.kind === kind).sort((a, b) => b.currentValueCents - a.currentValueCents);
            const activeTotal = list.filter((a) => a.active).reduce((sum, a) => sum + a.currentValueCents, 0);
            return { kind, list, activeTotal };
        }).filter((group) => group.list.length > 0);
    }, [assets]);

    return (
        <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{{ de: 'Vermögen', en: 'Wealth' }[locale]}</h2>
                <Button type="button" size="sm" onClick={onNew}>
                    <PlusIcon className="size-4" />
                    {{ de: 'Asset hinzufügen', en: 'Add asset' }[locale]}
                </Button>
            </div>

            {assets.length === 0 ? (
                <GlassCard className="mt-4 px-5 py-8 text-center">
                    <p className="text-sm text-foreground/70">
                        {
                            {
                                de: 'Noch keine Assets. Tagesgeld, ETFs, Aktien oder Bauspar — mit einem Standort-Label (TradeRepublic, Chase, …).',
                                en: 'No assets yet. Tagesgeld, ETFs, stocks, or Bauspar — with a location label (TradeRepublic, Chase, …).',
                            }[locale]
                        }
                    </p>
                    <Button type="button" className="mt-4" onClick={onNew}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Erstes Asset anlegen', en: 'Add the first asset' }[locale]}
                    </Button>
                </GlassCard>
            ) : (
                <div className="mt-4 space-y-8">
                    {grouped.map(({ kind, list, activeTotal }) => {
                        const Icon = ASSET_KIND_ICONS[kind];
                        return (
                            <div key={kind}>
                                <div className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2">
                                    <h3 className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                                        <Icon className="size-4" />
                                        {ASSET_KIND_LABELS[kind][locale]}
                                        <span className="text-foreground/45 font-normal">({list.length})</span>
                                    </h3>
                                    <span className="text-sm font-semibold tabular-nums">
                                        {formatCurrency(activeTotal, { locale, maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                                <ul className="mt-1 divide-y divide-border/40">
                                    {list.map((asset) => (
                                        <AssetRowItem
                                            key={asset.assetId}
                                            asset={asset}
                                            locale={locale}
                                            onEdit={() => onEdit(asset)}
                                            onReprice={() => onReprice(asset)}
                                            onDelete={() => onDelete(asset)}
                                        />
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function AssetRowItem({
    asset,
    locale,
    onEdit,
    onReprice,
    onDelete,
}: {
    asset: AssetRow;
    locale: Locale;
    onEdit: () => void;
    onReprice: () => void;
    onDelete: () => void;
}) {
    const impliedPrice =
        asset.kind === 'security' && asset.shares != null && asset.shares > 0 ? Math.round(asset.currentValueCents / asset.shares) : null;

    return (
        <li className={cn('group flex items-start justify-between gap-3 py-3', !asset.active && 'opacity-55')}>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{asset.name}</span>
                    {asset.symbol ? <span className="text-xs text-foreground/50 tabular-nums">{asset.symbol}</span> : null}
                    {!asset.active ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {{ de: 'Pausiert', en: 'Paused' }[locale]}
                        </span>
                    ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/60">
                    <span className="rounded border border-border/60 px-1.5 py-0.5">{asset.location}</span>
                    {asset.kind === 'security' && asset.shares != null ? (
                        <span className="tabular-nums">
                            {asset.shares} {{ de: 'Anteile', en: 'shares' }[locale]}
                            {impliedPrice != null
                                ? ` · ≈ ${formatCurrency(impliedPrice, { locale, maximumFractionDigits: 2 })}/${{ de: 'Stück', en: 'share' }[locale]}`
                                : ''}
                        </span>
                    ) : null}
                    {asset.notes ? <span className="truncate">{asset.notes}</span> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <span className="mr-2 text-sm font-semibold tabular-nums">
                    {formatCurrency(asset.currentValueCents, { locale, maximumFractionDigits: 0 })}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={onReprice}
                    aria-label={{ de: 'Neu bewerten', en: 'Reprice' }[locale]}
                >
                    <RefreshCwIcon className="size-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={onEdit}
                    aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                >
                    <PencilIcon className="size-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={onDelete}
                    aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                >
                    <Trash2Icon className="size-4" />
                </Button>
            </div>
        </li>
    );
}

// --- Period summary (income + payments) ------------------------------------

function PeriodSummary({ incomeCents, expensesCents, locale }: { incomeCents: number; expensesCents: number; locale: Locale }) {
    const leftoverCents = incomeCents - expensesCents;
    const hasIncome = incomeCents > 0;
    return (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-foreground/60">{{ de: 'Einkommen', en: 'Income' }[locale]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {hasIncome ? (
                        formatCurrency(incomeCents, { locale, maximumFractionDigits: 0 })
                    ) : (
                        <span className="text-foreground/65 text-base font-normal">
                            {{ de: 'Keine aktiven Ströme', en: 'No active streams' }[locale]}
                        </span>
                    )}
                </div>
                <div className="mt-1 text-xs text-foreground/65 tabular-nums">
                    {!hasIncome
                        ? { de: 'Lege unten einen Einkommensstrom an.', en: 'Add an income stream below.' }[locale]
                        : leftoverCents >= 0
                          ? {
                                de: `${formatCurrency(leftoverCents, { locale, maximumFractionDigits: 0 })} übrig`,
                                en: `${formatCurrency(leftoverCents, { locale, maximumFractionDigits: 0 })} leftover`,
                            }[locale]
                          : {
                                de: `${formatCurrency(-leftoverCents, { locale, maximumFractionDigits: 0 })} über dem Einkommen`,
                                en: `${formatCurrency(-leftoverCents, { locale, maximumFractionDigits: 0 })} over income`,
                            }[locale]}
                </div>
            </GlassCard>
            <GlassCard className="px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-foreground/60">{{ de: 'Zahlungen', en: 'Payments' }[locale]}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatCurrency(expensesCents, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="mt-1 text-xs text-foreground/65">
                    {{ de: 'Summe aller aktiven Positionen', en: 'Sum of every active cost' }[locale]}
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
        <nav
            className="flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-fade-x"
            aria-label={{ de: 'Zeitraum', en: 'Period' }[locale]}
        >
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
    incomeCents,
    locale,
}: {
    costs: ReadonlyArray<CostRow>;
    period: PeriodFilter;
    incomeCents: number;
    locale: Locale;
}) {
    const { nodes, links, totalCents } = useMemo(
        () => buildSankey(costs, period, incomeCents, locale),
        [costs, period, incomeCents, locale],
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
        de: `Sankey-Diagramm der Ausgaben (${PERIOD_LABELS[period].de.toLowerCase()}): ${formatCurrency(totalCents, { locale, maximumFractionDigits: 0 })} verteilt auf ${costs.length} Positionen.`,
        en: `Sankey diagram of expenses (${PERIOD_LABELS[period].en.toLowerCase()}): ${formatCurrency(totalCents, { locale, maximumFractionDigits: 0 })} across ${costs.length} costs.`,
    }[locale];

    return <FinancesSankey nodes={nodes} links={links} locale={locale} ariaLabel={ariaLabel} />;
}

// --- Income streams --------------------------------------------------------

function IncomeStreamsSection({
    streams,
    period,
    locale,
    onNew,
    onEdit,
    onDelete,
}: {
    streams: ReadonlyArray<IncomeRow>;
    period: PeriodFilter;
    locale: Locale;
    onNew: () => void;
    onEdit: (stream: IncomeRow) => void;
    onDelete: (stream: IncomeRow) => void;
}) {
    const activeTotal = streams.filter((s) => s.active).reduce((sum, s) => sum + projectedCents(s, period), 0);

    return (
        <section className="mt-10" aria-labelledby="finances-income-streams">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2
                    id="finances-income-streams"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider"
                >
                    <WalletIcon className="size-4" aria-hidden />
                    {{ de: 'Einkommensströme', en: 'Income streams' }[locale]}
                    <span className="text-xs font-medium normal-case tracking-normal text-foreground/60">
                        {{ de: `${streams.length} Ströme`, en: `${streams.length} streams` }[locale]}
                    </span>
                </h2>
                <div className="flex items-center gap-3">
                    {streams.length > 0 ? (
                        <div className="text-xs tabular-nums text-foreground/60">
                            {formatCurrency(activeTotal, { locale, maximumFractionDigits: 0 })}
                        </div>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={onNew}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Einkommen', en: 'Income' }[locale]}
                    </Button>
                </div>
            </div>
            {streams.length === 0 ? (
                <p className="text-sm text-foreground/65">
                    {
                        {
                            de: 'Noch keine Einkommensströme — Gehalt, Freelance oder anderes.',
                            en: 'No income streams yet — salary, freelance, or other.',
                        }[locale]
                    }
                </p>
            ) : (
                <ul className="divide-y divide-border/60 border-y border-border/60">
                    {streams.map((stream) => (
                        <IncomeRowItem
                            key={stream.incomeStreamId}
                            stream={stream}
                            period={period}
                            locale={locale}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
        </section>
    );
}

function IncomeRowItem({
    stream,
    period,
    locale,
    onEdit,
    onDelete,
}: {
    stream: IncomeRow;
    period: PeriodFilter;
    locale: Locale;
    onEdit: (stream: IncomeRow) => void;
    onDelete: (stream: IncomeRow) => void;
}) {
    const projected = projectedCents(stream, period);
    // Cadence meta only when it differs from the page period — otherwise
    // "3.500 € · monatlich" next to a monthly tab is noise.
    const showCadence = stream.cadence !== period;
    return (
        <li className={cn('group flex items-center gap-3 py-3 sm:gap-4', !stream.active && 'opacity-60')}>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">{stream.name}</span>
                    {!stream.active ? (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
                            {{ de: 'Pausiert', en: 'Paused' }[locale]}
                        </span>
                    ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/65">
                    {showCadence ? (
                        <span className="inline-flex items-center gap-1">
                            <RepeatIcon className="size-3" aria-hidden />
                            {formatCurrency(stream.amountCents, { locale, maximumFractionDigits: 0 })} ·{' '}
                            {CADENCE_LABELS[stream.cadence][locale]}
                        </span>
                    ) : null}
                    {stream.startsOn || stream.endsOn ? (
                        <span>{formatDateRange(stream.startsOn, stream.endsOn, { locale, openEnded: true })}</span>
                    ) : null}
                    {stream.notes ? <span className="truncate max-w-xs">{stream.notes}</span> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <div className="text-right text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(projected, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(stream)}
                        aria-label={{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    >
                        <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive/70 hover:text-destructive"
                        onClick={() => onDelete(stream)}
                        aria-label={{ de: 'Löschen', en: 'Delete' }[locale]}
                    >
                        <Trash2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </li>
    );
}

// --- Recurring costs --------------------------------------------------------

function RecurringCostsSection({
    costs,
    period,
    locale,
    onNew,
    onEdit,
    onDelete,
}: {
    costs: ReadonlyArray<CostRow>;
    period: PeriodFilter;
    locale: Locale;
    onNew: () => void;
    onEdit: (cost: CostRow) => void;
    onDelete: (cost: CostRow) => void;
}) {
    const activeTotal = costs.filter((c) => c.active).reduce((sum, c) => sum + projectedCents(c, period), 0);

    return (
        <section className="mt-10" aria-labelledby="finances-recurring-costs">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <h2
                    id="finances-recurring-costs"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider"
                >
                    <CircleDollarSignIcon className="size-4" aria-hidden />
                    {{ de: 'Positionen', en: 'Costs' }[locale]}
                    <span className="text-xs font-medium normal-case tracking-normal text-foreground/60">
                        {{ de: `${costs.length} Positionen`, en: `${costs.length} costs` }[locale]}
                    </span>
                </h2>
                <div className="flex items-center gap-3">
                    {costs.length > 0 ? (
                        <div className="text-xs tabular-nums text-foreground/60">
                            {formatCurrency(activeTotal, { locale, maximumFractionDigits: 0 })}
                        </div>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={onNew}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Position', en: 'Cost' }[locale]}
                    </Button>
                </div>
            </div>
            {costs.length === 0 ? (
                <EmptyState locale={locale} onNew={onNew} />
            ) : (
                <GroupedList costs={costs} period={period} locale={locale} onEdit={onEdit} onDelete={onDelete} />
            )}
        </section>
    );
}

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
        const byCategory = new Map<GqlCAdminFinancesRecurringCostCategory, CostRow[]>();
        for (const row of costs) {
            const list = byCategory.get(row.categoryKey) ?? [];
            list.push(row);
            byCategory.set(row.categoryKey, list);
        }
        return categoryOrderForLocale(locale).flatMap((key) => {
            const list = byCategory.get(key);
            if (!list || list.length === 0) return [];
            const sorted = [...list].sort((a, b) => projectedCents(b, period) - projectedCents(a, period));
            const total = sorted.filter((r) => r.active).reduce((sum, r) => sum + projectedCents(r, period), 0);
            return [{ key, costs: sorted, total }];
        });
    }, [costs, period, locale]);

    return (
        <div className="space-y-8">
            {groups.map((group) => {
                const Icon = CATEGORY_ICONS[group.key];
                return (
                    <section key={group.key} aria-labelledby={`finances-cat-${group.key}`}>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                            <h3
                                id={`finances-cat-${group.key}`}
                                className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wider"
                            >
                                <Icon className="size-4" aria-hidden />
                                {CATEGORY_LABELS[group.key][locale]}
                                <span className="text-xs font-medium normal-case tracking-normal text-foreground/60">
                                    {{ de: `${group.costs.length} Positionen`, en: `${group.costs.length} costs` }[locale]}
                                </span>
                            </h3>
                            <div className="text-xs tabular-nums text-foreground/60">
                                {formatCurrency(group.total, { locale, maximumFractionDigits: 0 })}
                            </div>
                        </div>
                        <ul className="divide-y divide-border/60 border-y border-border/60">
                            {group.costs.map((cost) => (
                                <CostRowItem
                                    key={cost.costId}
                                    cost={cost}
                                    period={period}
                                    locale={locale}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

function CostRowItem({
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
    const showCadence = cost.cadence !== period;
    return (
        <li className={cn('group flex items-center gap-3 py-3 sm:gap-4', !cost.active && 'opacity-60')}>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">{cost.name}</span>
                    {!cost.active ? (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
                            {{ de: 'Pausiert', en: 'Paused' }[locale]}
                        </span>
                    ) : null}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/65">
                    {showCadence ? (
                        <span className="inline-flex items-center gap-1">
                            <RepeatIcon className="size-3" aria-hidden />
                            {formatCurrency(cost.amountCents, { locale, maximumFractionDigits: 0 })} ·{' '}
                            {CADENCE_LABELS[cost.cadence][locale]}
                        </span>
                    ) : null}
                    {cost.startsOn || cost.endsOn ? (
                        <span>{formatDateRange(cost.startsOn, cost.endsOn, { locale, openEnded: true })}</span>
                    ) : null}
                    {cost.notes ? <span className="truncate max-w-xs">{cost.notes}</span> : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <div className="text-right text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(projected, { locale, maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
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
        </li>
    );
}

// --- Edit dialogs -----------------------------------------------------------

type CostFormState = {
    costId: string | null;
    name: string;
    categoryKey: GqlCAdminFinancesRecurringCostCategory;
    amountEuros: string;
    cadence: GqlCAdminFinancesCadence;
    notes: string;
    active: boolean;
    startsOn: Date | undefined;
    endsOn: Date | undefined;
};

function EditCostDialog({ initial, locale, onClose }: { initial: CostRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<CostFormState>(() => ({
        costId: initial?.costId ?? null,
        name: initial?.name ?? '',
        categoryKey: initial?.categoryKey ?? 'other',
        amountEuros: initial?.amountCents != null ? centsToEuros(initial.amountCents) : '',
        cadence: initial?.cadence ?? 'monthly',
        notes: initial?.notes ?? '',
        active: initial?.active ?? true,
        startsOn: initial?.startsOn ? parseISO(initial.startsOn) : undefined,
        endsOn: initial?.endsOn ? parseISO(initial.endsOn) : undefined,
    }));
    const [, upsert] = useMutation(WorkspaceFinancesRecurringCostsUpsertDocument);
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
                        startsOn: state.startsOn ? formatIsoDate(state.startsOn) : null,
                        endsOn: state.endsOn ? formatIsoDate(state.endsOn) : null,
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
                            onValueChange={(v) => setState((s) => ({ ...s, categoryKey: v as GqlCAdminFinancesRecurringCostCategory }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categoryOrderForLocale(locale).map((key) => (
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
                        <Select
                            value={state.cadence}
                            onValueChange={(v) => setState((s) => ({ ...s, cadence: v as GqlCAdminFinancesCadence }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">{CADENCE_LABELS.monthly[locale]}</SelectItem>
                                <SelectItem value="quarterly">{CADENCE_LABELS.quarterly[locale]}</SelectItem>
                                <SelectItem value="yearly">{CADENCE_LABELS.yearly[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Beginn', en: 'Starts on' }[locale]}>
                        <DatePicker
                            value={state.startsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, startsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
                    </Field>
                    <Field label={{ de: 'Ende', en: 'Ends on' }[locale]}>
                        <DatePicker
                            value={state.endsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, endsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
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

type IncomeFormState = {
    incomeStreamId: string | null;
    name: string;
    amountEuros: string;
    cadence: GqlCAdminFinancesCadence;
    notes: string;
    active: boolean;
    startsOn: Date | undefined;
    endsOn: Date | undefined;
};

function EditIncomeDialog({ initial, locale, onClose }: { initial: IncomeRow | null; locale: Locale; onClose: () => void }) {
    const isNew = initial === null;
    const [state, setState] = useState<IncomeFormState>(() => ({
        incomeStreamId: initial?.incomeStreamId ?? null,
        name: initial?.name ?? '',
        amountEuros: initial?.amountCents != null ? centsToEuros(initial.amountCents) : '',
        cadence: initial?.cadence ?? 'monthly',
        notes: initial?.notes ?? '',
        active: initial?.active ?? true,
        startsOn: initial?.startsOn ? parseISO(initial.startsOn) : undefined,
        endsOn: initial?.endsOn ? parseISO(initial.endsOn) : undefined,
    }));
    const [, upsert] = useMutation(WorkspaceFinancesIncomeStreamsUpsertDocument);
    const [submitting, setSubmitting] = useState(false);

    const amountCents = eurosToCents(state.amountEuros);
    const canSave = state.name.trim().length > 0 && amountCents != null && amountCents > 0;

    const submit = async () => {
        if (!canSave) return;
        setSubmitting(true);
        try {
            const result = await upsert({
                financeIncomeStreams: [
                    {
                        incomeStreamId: state.incomeStreamId,
                        name: state.name.trim(),
                        amountCents: amountCents,
                        cadence: state.cadence,
                        notes: state.notes.trim() || null,
                        active: state.active,
                        startsOn: state.startsOn ? formatIsoDate(state.startsOn) : null,
                        endsOn: state.endsOn ? formatIsoDate(state.endsOn) : null,
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
                        {isNew
                            ? { de: 'Neuer Einkommensstrom', en: 'New income stream' }[locale]
                            : { de: 'Einkommensstrom bearbeiten', en: 'Edit income stream' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Betrag pro Turnus — Gehalt, Freelance, Mieteinnahmen und ähnliches.',
                                en: 'Amount per cadence — salary, freelance, rental income, and the like.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={{ de: 'Name', en: 'Name' }[locale]} required>
                        <Input value={state.name} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} autoFocus />
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
                        <Select
                            value={state.cadence}
                            onValueChange={(v) => setState((s) => ({ ...s, cadence: v as GqlCAdminFinancesCadence }))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">{CADENCE_LABELS.monthly[locale]}</SelectItem>
                                <SelectItem value="quarterly">{CADENCE_LABELS.quarterly[locale]}</SelectItem>
                                <SelectItem value="yearly">{CADENCE_LABELS.yearly[locale]}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={{ de: 'Beginn', en: 'Starts on' }[locale]}>
                        <DatePicker
                            value={state.startsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, startsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
                    </Field>
                    <Field label={{ de: 'Ende', en: 'Ends on' }[locale]}>
                        <DatePicker
                            value={state.endsOn}
                            onValueChange={(d) => setState((s) => ({ ...s, endsOn: d }))}
                            locale={DATE_FNS_LOCALE[locale]}
                            captionLayout="dropdown"
                            placeholder={{ de: 'Optional', en: 'Optional' }[locale]}
                            className="w-full"
                        />
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
        <label className={cn('flex w-full min-w-0 flex-col gap-1.5 text-sm', className)}>
            <span className="text-xs font-medium text-muted-foreground">
                {label}
                {required ? <span className="text-destructive"> *</span> : null}
            </span>
            {children}
        </label>
    );
}

// --- Delete confirmations ---------------------------------------------------

function DeleteCostAlert({ cost, locale, onClose }: { cost: CostRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceFinancesRecurringCostsDeleteDocument);
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

function DeleteIncomeAlert({ stream, locale, onClose }: { stream: IncomeRow; locale: Locale; onClose: () => void }) {
    const [, del] = useMutation(WorkspaceFinancesIncomeStreamsDeleteDocument);
    const [submitting, setSubmitting] = useState(false);
    const doDelete = async () => {
        setSubmitting(true);
        try {
            await del({ incomeStreamIds: [stream.incomeStreamId] });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <AlertDialog open onOpenChange={(open) => (open ? undefined : onClose())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Einkommensstrom löschen?', en: 'Delete this income stream?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${stream.name}“ wird endgültig entfernt. Alternativ kannst du ihn über „Aktiv“ pausieren, damit er in der Liste bleibt.`,
                                en: `"${stream.name}" will be removed permanently. As an alternative, uncheck "Active" to keep it in the list.`,
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
            <CircleDollarSignIcon className="mx-auto size-8 text-foreground/40" aria-hidden />
            <h3 className="mt-3 text-base font-semibold">{{ de: 'Noch keine Positionen', en: 'Nothing tracked yet' }[locale]}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-foreground/65">
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

type AmountCadenceRow = { amountCents: number; cadence: GqlCAdminFinancesCadence };

// Project a row's cents amount into the requested period.
// `amountCents` on the row is per its own `cadence`. Normalize via a yearly
// base so monthly ↔ quarterly ↔ yearly stays integer-clean (same CASE shape
// as `adminFinancesExpensesCentsFindOne`).
function projectedCents(row: AmountCadenceRow, period: PeriodFilter): number {
    if (row.cadence === period) return row.amountCents;
    const yearlyCents =
        row.cadence === 'yearly' ? row.amountCents : row.cadence === 'quarterly' ? row.amountCents * 4 : row.amountCents * 12;
    if (period === 'yearly') return yearlyCents;
    if (period === 'quarterly') return Math.round(yearlyCents / 4);
    return Math.round(yearlyCents / 12);
}

function buildSankey(
    costs: ReadonlyArray<CostRow>,
    period: PeriodFilter,
    incomeCents: number,
    locale: Locale,
): { nodes: FinancesSankeyInputNode[]; links: FinancesSankeyInputLink[]; totalCents: number } {
    const nodes: FinancesSankeyInputNode[] = [];
    const links: FinancesSankeyInputLink[] = [];

    if (costs.length === 0) return { nodes, links, totalCents: 0 };

    const totalCents = costs.reduce((sum, row) => sum + projectedCents(row, period), 0);
    const hasIncome = incomeCents > 0;

    const incomeId = 'income';
    nodes.push({
        id: incomeId,
        kind: 'income',
        label: hasIncome ? { de: 'Einkommen', en: 'Income' }[locale] : { de: 'Ausgaben', en: 'Expenses' }[locale],
        sublabel: formatCurrency(hasIncome ? incomeCents : totalCents, { locale, maximumFractionDigits: 0 }),
    });

    const byCategory = new Map<GqlCAdminFinancesRecurringCostCategory, { total: number; rows: CostRow[] }>();
    for (const row of costs) {
        const entry = byCategory.get(row.categoryKey) ?? { total: 0, rows: [] };
        entry.total += projectedCents(row, period);
        entry.rows.push(row);
        byCategory.set(row.categoryKey, entry);
    }

    const categoriesSorted = [...byCategory.entries()].filter(([, entry]) => entry.total > 0).sort((a, b) => b[1].total - a[1].total);

    // Walk chart-2…5 then chart-1 so the largest category doesn't share
    // income's brand slot (chart-1). Cycle when there are more than five.
    const categoryColors: FinancesSankeyColor[] = [2, 3, 4, 5, 1];
    categoriesSorted.forEach(([key, entry], index) => {
        const color = categoryColors[index % categoryColors.length] ?? 2;
        const categoryId = `category:${key}`;
        nodes.push({
            id: categoryId,
            kind: 'category',
            label: CATEGORY_LABELS[key][locale],
            sublabel: formatCurrency(entry.total, { locale, maximumFractionDigits: 0 }),
            color,
        });
        links.push({ source: incomeId, target: categoryId, valueCents: entry.total, color });

        const rowsSorted = [...entry.rows].sort((a, b) => projectedCents(b, period) - projectedCents(a, period));
        for (const row of rowsSorted) {
            const itemId = `item:${row.costId}`;
            const amount = projectedCents(row, period);
            nodes.push({
                id: itemId,
                kind: 'item',
                label: row.name,
                sublabel: formatCurrency(amount, { locale, maximumFractionDigits: 0 }),
                color,
            });
            links.push({ source: categoryId, target: itemId, valueCents: amount, color });
        }
    });

    return { nodes, links, totalCents };
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

// --- Wealth asset dialogs ---------------------------------------------------

function EditAssetDialog({
    initial,
    knownLocations,
    locale,
    onClose,
}: {
    initial: AssetRow | null;
    knownLocations: readonly string[];
    locale: Locale;
    onClose: () => void;
}) {
    const isNew = initial === null;
    const [kind, setKind] = useState<GqlCAdminFinancesAssetKind>(initial?.kind ?? 'cash');
    const [name, setName] = useState(initial?.name ?? '');
    const [location, setLocation] = useState(initial?.location ?? '');
    const [valueEuros, setValueEuros] = useState(initial ? centsToEuros(initial.currentValueCents) : '');
    const [shares, setShares] = useState(initial?.shares != null ? String(initial.shares) : '');
    const [symbol, setSymbol] = useState(initial?.symbol ?? '');
    const [isin, setIsin] = useState(initial?.isin ?? '');
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [active, setActive] = useState(initial?.active ?? true);
    const [error, setError] = useState<string | null>(null);
    const [{ fetching }, upsert] = useMutation(WorkspaceFinancesAssetsUpsertDocument);

    const locationListId = 'finance-asset-locations';

    async function handleSave() {
        setError(null);
        const trimmedName = name.trim();
        const trimmedLocation = location.trim();
        if (!trimmedName) {
            setError({ de: 'Name ist erforderlich.', en: 'Name is required.' }[locale]);
            return;
        }
        if (!trimmedLocation) {
            setError({ de: 'Standort ist erforderlich.', en: 'Location is required.' }[locale]);
            return;
        }
        const isSecurity = kind === 'security';
        let sharesNumber: number | null = null;
        if (isSecurity) {
            const parsed = Number.parseFloat(shares.trim().replace(',', '.'));
            if (Number.isNaN(parsed) || parsed <= 0) {
                setError({ de: 'Anteile müssen größer als 0 sein.', en: 'Shares must be greater than 0.' }[locale]);
                return;
            }
            sharesNumber = parsed;
        }
        let currentValueCents: number | null | undefined = undefined;
        if (isNew) {
            const cents = eurosToCents(valueEuros);
            if (cents == null || cents < 0) {
                setError({ de: 'Wert ist erforderlich.', en: 'Value is required.' }[locale]);
                return;
            }
            currentValueCents = cents;
        }

        const result = await upsert({
            financeAssets: [
                {
                    assetId: initial?.assetId ?? null,
                    kind,
                    name: trimmedName,
                    location: trimmedLocation,
                    currentValueCents: currentValueCents ?? null,
                    shares: sharesNumber,
                    symbol: isSecurity ? symbol.trim() || null : null,
                    isin: isSecurity ? isin.trim() || null : null,
                    notes: notes.trim() || null,
                    active,
                },
            ],
        });
        if (result.error) {
            setError(result.error.message);
            return;
        }
        onClose();
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isNew ? { de: 'Asset hinzufügen', en: 'Add asset' }[locale] : { de: 'Asset bearbeiten', en: 'Edit asset' }[locale]}
                    </DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: 'Was du besitzt — der Standort ist nur, wo es liegt (TradeRepublic, Chase, …).',
                                en: 'What you own — location is only where it sits (TradeRepublic, Chase, …).',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-2">
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-foreground/70">{{ de: 'Art', en: 'Kind' }[locale]}</span>
                        <Select value={kind} onValueChange={(v) => setKind(v as GqlCAdminFinancesAssetKind)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ASSET_KIND_ORDER.map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {ASSET_KIND_LABELS[k][locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-foreground/70">{{ de: 'Name', en: 'Name' }[locale]}</span>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tagesgeld / VWCE / …" />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-foreground/70">{{ de: 'Standort', en: 'Location' }[locale]}</span>
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            list={locationListId}
                            placeholder="TradeRepublic / Chase / LBS"
                        />
                        <datalist id={locationListId}>
                            {knownLocations.map((loc) => (
                                <option key={loc} value={loc} />
                            ))}
                        </datalist>
                    </label>
                    {kind === 'security' ? (
                        <>
                            <label className="grid gap-1.5 text-sm">
                                <span className="text-foreground/70">{{ de: 'Anteile', en: 'Shares' }[locale]}</span>
                                <Input value={shares} onChange={(e) => setShares(e.target.value)} inputMode="decimal" />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="grid gap-1.5 text-sm">
                                    <span className="text-foreground/70">{{ de: 'Symbol', en: 'Symbol' }[locale]}</span>
                                    <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="VWCE" />
                                </label>
                                <label className="grid gap-1.5 text-sm">
                                    <span className="text-foreground/70">ISIN</span>
                                    <Input value={isin} onChange={(e) => setIsin(e.target.value)} placeholder="IE00…" />
                                </label>
                            </div>
                        </>
                    ) : null}
                    {isNew ? (
                        <label className="grid gap-1.5 text-sm">
                            <span className="text-foreground/70">{{ de: 'Aktueller Wert (€)', en: 'Current value (€)' }[locale]}</span>
                            <Input value={valueEuros} onChange={(e) => setValueEuros(e.target.value)} inputMode="decimal" />
                        </label>
                    ) : (
                        <p className="text-xs text-foreground/60">
                            {
                                {
                                    de: `Aktueller Wert: ${formatCurrency(initial.currentValueCents, { locale })} — zum Ändern „Neu bewerten“ nutzen.`,
                                    en: `Current value: ${formatCurrency(initial.currentValueCents, { locale })} — use “Reprice” to change it.`,
                                }[locale]
                            }
                        </p>
                    )}
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-foreground/70">{{ de: 'Notizen', en: 'Notes' }[locale]}</span>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                    </label>
                    <label className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-foreground/70">{{ de: 'Aktiv', en: 'Active' }[locale]}</span>
                        <Switch checked={active} onCheckedChange={setActive} />
                    </label>
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={fetching}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RepriceAssetDialog({ asset, locale, onClose }: { asset: AssetRow; locale: Locale; onClose: () => void }) {
    const [valueEuros, setValueEuros] = useState(centsToEuros(asset.currentValueCents));
    const [shares, setShares] = useState(asset.shares != null ? String(asset.shares) : '');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [{ fetching }, reprice] = useMutation(WorkspaceFinancesAssetsRepriceDocument);

    async function handleSave() {
        setError(null);
        const cents = eurosToCents(valueEuros);
        if (cents == null || cents < 0) {
            setError({ de: 'Wert ist erforderlich.', en: 'Value is required.' }[locale]);
            return;
        }
        let sharesNumber: number | null = null;
        if (asset.kind === 'security' && shares.trim() !== '') {
            const parsed = Number.parseFloat(shares.trim().replace(',', '.'));
            if (Number.isNaN(parsed) || parsed <= 0) {
                setError({ de: 'Anteile müssen größer als 0 sein.', en: 'Shares must be greater than 0.' }[locale]);
                return;
            }
            sharesNumber = parsed;
        }
        const result = await reprice({
            inputs: [
                {
                    assetId: asset.assetId,
                    valueCents: cents,
                    shares: sharesNumber,
                    note: note.trim() || null,
                },
            ],
        });
        if (result.error) {
            setError(result.error.message);
            return;
        }
        onClose();
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ de: 'Neu bewerten', en: 'Reprice' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {asset.name} · {asset.location}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-foreground/70">{{ de: 'Neuer Wert (€)', en: 'New value (€)' }[locale]}</span>
                        <Input value={valueEuros} onChange={(e) => setValueEuros(e.target.value)} inputMode="decimal" />
                    </label>
                    {asset.kind === 'security' ? (
                        <label className="grid gap-1.5 text-sm">
                            <span className="text-foreground/70">{{ de: 'Anteile (optional)', en: 'Shares (optional)' }[locale]}</span>
                            <Input value={shares} onChange={(e) => setShares(e.target.value)} inputMode="decimal" />
                        </label>
                    ) : null}
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-foreground/70">{{ de: 'Notiz', en: 'Note' }[locale]}</span>
                        <Input value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={fetching}>
                        {{ de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteAssetAlert({ asset, locale, onClose }: { asset: AssetRow; locale: Locale; onClose: () => void }) {
    const [{ fetching }, remove] = useMutation(WorkspaceFinancesAssetsDeleteDocument);

    async function handleDelete() {
        await remove({ assetIds: [asset.assetId] });
        onClose();
    }

    return (
        <AlertDialog open onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Asset löschen?', en: 'Delete asset?' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `„${asset.name}“ bei ${asset.location} wird dauerhaft entfernt. Pausieren (Aktiv aus) ist die sanftere Alternative.`,
                                en: `“${asset.name}” at ${asset.location} will be permanently removed. Pausing (Active off) is the softer alternative.`,
                            }[locale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={fetching}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
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
