import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import {
    BrainIcon,
    EyeOffIcon,
    InfoIcon,
    MessageSquareTextIcon,
    RefreshCwIcon,
    ShieldCheckIcon,
    UserRoundIcon,
    WavesIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation } from 'urql';
import { z } from 'zod';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { Button } from '../../../web/components/base/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../web/components/base/tooltip';
import { GlassCard } from '../../../web/components/GlassCard';
import type { GqlCProfileObservationCategory, GqlCWorkspaceProfilePageQuery } from '../../../web/graphql/generated';
import {
    WorkspaceProfileObservationDismissDocument,
    WorkspaceProfilePageDocument,
    WorkspaceProfileSynthesizeRequestDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace profile page (`/workspace/profile`). Three synthesized artifacts +
// the underlying observations stream. Cem reads this; the assistant does NOT.
// Only the `summary` artifact crosses back into the personal-assistant prompt
// — see `docs/features/profile.md`.
//
// Data flow follows the standard workspace pattern: filter state lives in the
// URL via `validateSearch`, the loader sees those filters through
// `loaderDeps`, and `routeLoaderGraphqlClient` does the fetch server-side so
// the first paint already carries filtered data. Mutations call
// `router.invalidate()` to re-run the loader rather than imperatively
// refetching. Reloading the page keeps the user's filter view; chip clicks
// produce shareable URLs.

const pageTitle = { de: 'Profil', en: 'Profile' };
const pageDescription = {
    de: 'Was dein Assistent über dich weiß — und was ihm nicht gezeigt wird.',
    en: 'What your assistant knows about you — and what is kept from it.',
};

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

type ProfileQueryData = NonNullable<GqlCWorkspaceProfilePageQuery['admin']>;
type ProfileData = ProfileQueryData['profile'];
type ObservationRow = ProfileData['observations'][number];
type ProfileTab = 'summary' | 'prose' | 'psychProfile';

const OBSERVATION_CATEGORIES = ['factual', 'behavioral', 'psychological'] as const satisfies ReadonlyArray<GqlCProfileObservationCategory>;

// `category` is absent when "all" is selected — one canonical URL per state.
// `includeDismissed` is absent when false for the same reason.
const profileSearchSchema = z.object({
    category: z.enum(OBSERVATION_CATEGORIES).optional(),
    includeDismissed: z.boolean().optional(),
});

type ProfileSearch = z.infer<typeof profileSearchSchema>;
type ObservationFilter = 'all' | GqlCProfileObservationCategory;

export const Route = createFileRoute('/{-$locale}/workspace/profile')({
    validateSearch: profileSearchSchema,
    loaderDeps: ({ search }) => ({
        category: search.category ?? null,
        includeDismissed: search.includeDismissed ?? false,
    }),
    loader: ({ deps }) =>
        routeLoaderGraphqlClient(WorkspaceProfilePageDocument, {
            category: deps.category,
            includeDismissed: deps.includeDismissed,
        })(),
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: pageTitle[locale],
            description: pageDescription[locale],
            path: '/workspace/profile',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceProfilePage,
});

function WorkspaceProfilePage() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const router = useRouter();
    const filter: ObservationFilter = search.category ?? 'all';
    const includeDismissed = search.includeDismissed ?? false;
    const invalidate = () => router.invalidate();

    const profile = data.admin.profile;

    return (
        <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full pb-20">
            <header className="mt-10 mb-10">
                <p className="max-w-2xl text-base text-muted-foreground">{pageDescription[locale]}</p>
            </header>

            <SynthesisHero profile={profile} locale={locale} onSynthesized={invalidate} />
            <ObservationsSection
                observations={profile.observations}
                filter={filter}
                includeDismissed={includeDismissed}
                locale={locale}
                onChanged={invalidate}
            />
        </main>
    );
}

// --- Synthesis hero ---------------------------------------------------------

// Three artifacts in a tab strip. Summary first because it's the one fed
// back to the agent — Cem should see it before reading further. The
// firewall is signposted on the psych tab so the meta-meaning ("this is
// private to me") is part of the layout, not a buried explanation.
function SynthesisHero({ profile, locale, onSynthesized }: { profile: ProfileData; locale: Locale; onSynthesized: () => void }) {
    const [tab, setTab] = useState<ProfileTab>('summary');
    const [{ fetching: synthesizing }, synthesize] = useMutation(WorkspaceProfileSynthesizeRequestDocument);
    const [justQueued, setJustQueued] = useState(false);

    const isEmpty = !profile.summary && !profile.prose && !profile.psychProfile;

    const synthesizedLabel = profile.synthesizedAt
        ? formatDistanceToNow(parseISO(profile.synthesizedAt as unknown as string), {
              addSuffix: true,
              locale: DATE_FNS_LOCALE[locale],
          })
        : null;

    return (
        <section aria-label={{ de: 'Synthese', en: 'Synthesis' }[locale]}>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <TabStrip locale={locale} active={tab} onChange={setTab} />
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    {synthesizedLabel ? (
                        <span>
                            {{ de: 'Synthetisiert', en: 'Synthesized' }[locale]} · {synthesizedLabel}
                        </span>
                    ) : (
                        <span>{{ de: 'Noch nicht synthetisiert', en: 'Not synthesized yet' }[locale]}</span>
                    )}
                    {profile.observationsSinceSynthesis > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                            {profile.observationsSinceSynthesis}{' '}
                            {profile.observationsSinceSynthesis === 1
                                ? { de: 'neue Beobachtung', en: 'new observation' }[locale]
                                : { de: 'neue Beobachtungen', en: 'new observations' }[locale]}
                        </span>
                    ) : null}
                </div>
            </div>

            <GlassCard className="mt-4 px-6 py-6 md:px-8 md:py-7">
                {isEmpty ? <EmptyState locale={locale} /> : <ArtifactBody tab={tab} profile={profile} locale={locale} />}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
                    <TabExplainer tab={tab} locale={locale} />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={synthesizing}
                        onClick={async () => {
                            const result = await synthesize({});
                            if (result.data?.admin.profileSynthesizeRequest.success) {
                                setJustQueued(true);
                                // Poll for ~6s after enqueue — synthesis is a few seconds
                                // and the user shouldn't have to refresh.
                                setTimeout(() => {
                                    onSynthesized();
                                    setJustQueued(false);
                                }, 6000);
                            }
                        }}
                    >
                        <RefreshCwIcon className={cn(synthesizing && 'animate-spin')} />
                        {justQueued
                            ? { de: 'Wird verarbeitet…', en: 'Processing…' }[locale]
                            : { de: 'Jetzt neu synthetisieren', en: 'Re-synthesize now' }[locale]}
                    </Button>
                </div>
            </GlassCard>
        </section>
    );
}

function TabStrip({ locale, active, onChange }: { locale: Locale; active: ProfileTab; onChange: (tab: ProfileTab) => void }) {
    const tabs: { id: ProfileTab; label: { de: string; en: string }; icon: LucideIcon }[] = [
        { id: 'summary', label: { de: 'Kurz', en: 'Summary' }, icon: ShieldCheckIcon },
        { id: 'prose', label: { de: 'Porträt', en: 'Portrait' }, icon: UserRoundIcon },
        { id: 'psychProfile', label: { de: 'Psychologisch', en: 'Psychological' }, icon: WavesIcon },
    ];
    return (
        <div
            role="tablist"
            aria-label={{ de: 'Profil-Sicht', en: 'Profile view' }[locale]}
            className="flex gap-1 rounded-lg bg-muted/40 p-1"
        >
            {tabs.map((t) => {
                const isActive = active === t.id;
                const Icon = t.icon;
                return (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(t.id)}
                        className={cn(
                            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                        )}
                    >
                        <Icon className="size-3.5" />
                        {t.label[locale]}
                    </button>
                );
            })}
        </div>
    );
}

function ArtifactBody({ tab, profile, locale }: { tab: ProfileTab; profile: ProfileData; locale: Locale }) {
    const content = profile[tab];
    if (!content || !content.trim()) {
        return (
            <p className="text-sm text-muted-foreground italic">
                {
                    {
                        de: 'Noch leer. Wenn deine Assistenten-Chats etwas zu zeigen geben, erscheint hier eine Synthese.',
                        en: 'Nothing here yet. Once your assistant chats reveal something, the synthesis will appear here.',
                    }[locale]
                }
            </p>
        );
    }
    return <AssistantMarkdown text={content} className="text-base leading-relaxed" />;
}

function TabExplainer({ tab, locale }: { tab: ProfileTab; locale: Locale }) {
    const explainers: Record<ProfileTab, { de: string; en: string; tone: 'fed' | 'private' }> = {
        summary: {
            de: 'Dieser Text wird in den Systemprompt deines persönlichen Assistenten injiziert.',
            en: "This text is injected into your personal assistant's system prompt.",
            tone: 'fed',
        },
        prose: {
            de: 'Nur für dich. Wird dem Assistenten niemals gezeigt.',
            en: 'Yours only. Never shown to the assistant.',
            tone: 'private',
        },
        psychProfile: {
            de: 'Hinter einer Wand: niemals zurück in einen Prompt eingespeist.',
            en: 'Firewalled: never fed back into any prompt.',
            tone: 'private',
        },
    };
    const ex = explainers[tab];
    const Icon = ex.tone === 'fed' ? InfoIcon : EyeOffIcon;
    return (
        <div className={cn('flex items-center gap-2 text-xs', ex.tone === 'fed' ? 'text-primary/80' : 'text-muted-foreground')}>
            <Icon className="size-3.5 shrink-0" />
            <span>{ex[locale]}</span>
        </div>
    );
}

function EmptyState({ locale }: { locale: Locale }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
                <BrainIcon className="size-6" />
            </div>
            <div className="max-w-md">
                <h3 className="font-semibold text-foreground">
                    {{ de: 'Dein Profil baut sich gerade auf', en: 'Your profile is still building' }[locale]}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {
                        {
                            de: 'Schreibe mit deinem Assistenten und der Analyzer extrahiert nach und nach Beobachtungen. Sobald genug Material da ist, läuft die Synthese automatisch.',
                            en: 'Chat with your assistant — the analyzer extracts observations one at a time. The synthesizer runs automatically once enough material is in.',
                        }[locale]
                    }
                </p>
            </div>
        </div>
    );
}

// --- Observations stream ----------------------------------------------------

function ObservationsSection({
    observations,
    filter,
    includeDismissed,
    locale,
    onChanged,
}: {
    observations: ReadonlyArray<ObservationRow>;
    filter: ObservationFilter;
    includeDismissed: boolean;
    locale: Locale;
    onChanged: () => void;
}) {
    return (
        <section className="mt-12" aria-label={{ de: 'Beobachtungen', en: 'Observations' }[locale]}>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                        {{ de: 'Beobachtungen', en: 'Observations' }[locale]}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {
                            {
                                de: 'Jede Zeile kommt aus einer deiner Assistent-Nachrichten. Klick zum Quelltext.',
                                en: 'Each row comes from one of your assistant messages. Click to jump to its source.',
                            }[locale]
                        }
                    </p>
                </div>
                <DismissedToggle includeDismissed={includeDismissed} locale={locale} />
            </div>

            <FilterChips active={filter} locale={locale} />

            {observations.length === 0 ? (
                <p className="mt-8 text-sm text-muted-foreground italic">
                    {
                        {
                            de: 'Keine Beobachtungen in dieser Sicht.',
                            en: 'No observations in this view.',
                        }[locale]
                    }
                </p>
            ) : (
                <ul className="mt-6 flex flex-col gap-3">
                    {observations.map((obs) => (
                        <ObservationCard key={obs.observationId} observation={obs} locale={locale} onChanged={onChanged} />
                    ))}
                </ul>
            )}
        </section>
    );
}

// Toggle for the dismissed filter. Rendered as a `<Link>` so the URL stays
// canonical and shareable; `replace` so the back button doesn't accumulate
// noise from a chip dance.
function DismissedToggle({ includeDismissed, locale }: { includeDismissed: boolean; locale: Locale }) {
    return (
        <Link
            to="/{-$locale}/workspace/profile"
            from="/{-$locale}/workspace/profile"
            search={(prev: ProfileSearch) => ({ ...prev, includeDismissed: includeDismissed ? undefined : true })}
            replace
            className={cn(
                'text-xs px-2.5 py-1.5 rounded-md border transition-colors',
                includeDismissed
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border',
            )}
        >
            {includeDismissed
                ? { de: 'Verworfene einblenden', en: 'Showing dismissed' }[locale]
                : { de: 'Verworfene anzeigen', en: 'Show dismissed' }[locale]}
        </Link>
    );
}

const CATEGORY_LABELS: Record<GqlCProfileObservationCategory, { de: string; en: string }> = {
    factual: { de: 'Faktisch', en: 'Factual' },
    behavioral: { de: 'Verhalten', en: 'Behavioral' },
    psychological: { de: 'Psychologisch', en: 'Psychological' },
};

const CATEGORY_ACCENT: Record<GqlCProfileObservationCategory, string> = {
    factual: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30',
    behavioral: 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30',
    psychological: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30',
};

function FilterChips({ active, locale }: { active: ObservationFilter; locale: Locale }) {
    const filters: { id: ObservationFilter; label: { de: string; en: string } }[] = [
        { id: 'all', label: { de: 'Alle', en: 'All' } },
        { id: 'factual', label: CATEGORY_LABELS.factual },
        { id: 'behavioral', label: CATEGORY_LABELS.behavioral },
        { id: 'psychological', label: CATEGORY_LABELS.psychological },
    ];
    return (
        <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((f) => {
                const isActive = active === f.id;
                return (
                    <Link
                        key={f.id}
                        to="/{-$locale}/workspace/profile"
                        from="/{-$locale}/workspace/profile"
                        // "all" → drop the `category` key entirely so the canonical
                        // URL for the unfiltered view has no `?category=`.
                        search={(prev: ProfileSearch) => ({
                            ...prev,
                            category: f.id === 'all' ? undefined : f.id,
                        })}
                        replace
                        className={cn(
                            'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                            isActive
                                ? f.id === 'all'
                                    ? 'border-foreground bg-foreground text-background'
                                    : CATEGORY_ACCENT[f.id]
                                : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border',
                        )}
                    >
                        {f.label[locale]}
                    </Link>
                );
            })}
        </div>
    );
}

function ObservationCard({ observation, locale, onChanged }: { observation: ObservationRow; locale: Locale; onChanged: () => void }) {
    const [, dismiss] = useMutation(WorkspaceProfileObservationDismissDocument);
    const [busy, setBusy] = useState(false);
    const isDismissed = !!observation.dismissedAt;

    const ageLabel = useMemo(
        () =>
            formatDistanceToNow(parseISO(observation.createdAt as unknown as string), {
                addSuffix: true,
                locale: DATE_FNS_LOCALE[locale],
            }),
        [observation.createdAt, locale],
    );

    return (
        <li>
            <GlassCard className={cn('px-5 py-4 transition-opacity', isDismissed && 'opacity-50')}>
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                        <span
                            className={cn(
                                'inline-flex items-center text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border',
                                CATEGORY_ACCENT[observation.category],
                            )}
                        >
                            {CATEGORY_LABELS[observation.category][locale]}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {observation.confidence != null ? (
                                <ConfidenceMeter confidence={observation.confidence} locale={locale} />
                            ) : null}
                            <span>{ageLabel}</span>
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{observation.content}</p>
                    <div className="flex items-center justify-between gap-3 text-xs">
                        {observation.sourceChatId ? (
                            <Link
                                to="/{-$locale}/workspace/assistant"
                                search={{ chatId: observation.sourceChatId }}
                                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <MessageSquareTextIcon className="size-3.5" />
                                {{ de: 'Quelle ansehen', en: 'View source' }[locale]}
                            </Link>
                        ) : (
                            <span className="text-muted-foreground italic">{{ de: 'Quelle gelöscht', en: 'Source deleted' }[locale]}</span>
                        )}
                        {isDismissed ? (
                            <span className="text-muted-foreground italic">{{ de: 'Verworfen', en: 'Dismissed' }[locale]}</span>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={async () => {
                                    setBusy(true);
                                    await dismiss({ observationId: observation.observationId });
                                    onChanged();
                                    setBusy(false);
                                }}
                            >
                                {{ de: 'Verwerfen', en: 'Dismiss' }[locale]}
                            </Button>
                        )}
                    </div>
                </div>
            </GlassCard>
        </li>
    );
}

// Rendered as three small dots — fully filled, half filled, or empty —
// depending on the analyzer's confidence percent. Tooltip surfaces the exact
// number. Tight, glanceable, doesn't compete with the observation copy.
function ConfidenceMeter({ confidence, locale }: { confidence: number; locale: Locale }) {
    const dots = 3;
    const filled = Math.round((confidence / 100) * dots);
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5" aria-label={`${confidence}% confidence`}>
                        {Array.from({ length: dots }).map((_, i) => (
                            <span key={i} className={cn('size-1.5 rounded-full', i < filled ? 'bg-foreground/70' : 'bg-foreground/15')} />
                        ))}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                    {{ de: 'Konfidenz', en: 'Confidence' }[locale]}: {confidence}%
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
