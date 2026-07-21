import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
    AlertTriangleIcon,
    BrainIcon,
    BriefcaseIcon,
    DumbbellIcon,
    EyeOffIcon,
    InfoIcon,
    MessageCircleQuestionIcon,
    MessageSquareTextIcon,
    RefreshCwIcon,
    ShieldCheckIcon,
    StethoscopeIcon,
    UserRoundIcon,
    UsersIcon,
    WavesIcon,
    ZapIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { Button } from '../../../web/components/base/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../web/components/base/tooltip';
import { SpeakButton } from '../../../web/components/chat-message/shared';
import { CompassInterviewComposer } from '../../../web/chat/CompassInterviewComposer';
import { CompassInterviewTranscript } from '../../../web/chat/CompassInterviewTranscript';
import { useCompassInterviewLiveUpdates } from '../../../web/chat/useCompassInterviewLiveUpdates';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCCompassObservationCategory,
    GqlCWorkspaceCompassInterviewSummaryFragment,
    GqlCWorkspaceCompassInterviewWithMessagesFragment,
    GqlCWorkspaceCompassPageUpdatesSubscription,
    GqlCWorkspaceCompassPageUpdatesSubscriptionVariables,
    GqlCWorkspaceCompassPageUserFragment,
    GqlCCompassInterviewTopic,
} from '../../../web/graphql/generated';
import {
    WorkspaceCompassInterviewEndDocument,
    WorkspaceCompassInterviewSkipDocument,
    WorkspaceCompassInterviewStartDocument,
    WorkspaceCompassInterviewStartNowDocument,
    WorkspaceCompassObservationDismissDocument,
    WorkspaceCompassPageDocument,
    WorkspaceCompassPageUpdatesDocument,
    WorkspaceCompassScheduledInterviewDismissDocument,
    WorkspaceCompassSynthesizeRequestDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
import { DATE_FNS_LOCALE } from '../../../web/utils/dateFnsLocale';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// Workspace compass page (`/workspace/compass`). Three synthesized artifacts +
// the underlying observations stream. Cem reads this; the assistant does NOT.
// Only the `summary` artifact crosses back into the personal-assistant prompt
// — see `docs/features/compass.md`.
//
// Data flow: filter state lives in the URL via `validateSearch`, the loader
// sees those filters through `loaderDeps`, and `routeLoaderGraphqlClient`
// does the fetch server-side so the first paint already carries filtered
// data. The loader payload then seeds a `useState` that the
// `userUpdates` subscription replaces on every server push — both the
// dismissal mutation and the background synthesis job publish to that
// stream, so the page never needs to poll or invalidate. Reloading the page
// keeps the user's filter view; chip clicks produce shareable URLs. See
// `docs/architecture/state-synchronization.md` — Seed-and-Subscribe.

const pageTitle = { de: 'Kompass', en: 'Compass' };
const pageDescription = {
    de: 'Was dein Assistent über dich weiß — und was ihm nicht gezeigt wird.',
    en: 'What your assistant knows about you — and what is kept from it.',
};

type CompassQueryData = NonNullable<GqlCWorkspaceCompassPageUserFragment['admin']>;
type CompassData = CompassQueryData['adminCompassFindOne'];
type ObservationRow = NonNullable<CompassData>['adminCompassObservationFindMany'][number];
type InterviewSummary = GqlCWorkspaceCompassInterviewSummaryFragment;
type InterviewWithMessages = GqlCWorkspaceCompassInterviewWithMessagesFragment;
type CompassTab = 'summary' | 'prose' | 'psychology' | 'interviews';

const OBSERVATION_CATEGORIES = ['factual', 'behavioral', 'psychological'] as const satisfies ReadonlyArray<GqlCCompassObservationCategory>;
const COMPASS_TABS = ['summary', 'prose', 'psychology', 'interviews'] as const satisfies ReadonlyArray<CompassTab>;

// `category` is absent when "all" is selected — one canonical URL per state.
// `includeDismissed` is absent when false for the same reason.
// `tab` is absent when the default `summary` tab is active; `interviewId`
// rides alongside `tab=interviews` when a specific interview is open.
const compassSearchSchema = z.object({
    category: z.enum(OBSERVATION_CATEGORIES).optional(),
    includeDismissed: z.boolean().optional(),
    tab: z.enum(COMPASS_TABS).optional(),
    interviewId: z.uuid().optional(),
});

type CompassSearch = z.infer<typeof compassSearchSchema>;
type ObservationFilter = 'all' | GqlCCompassObservationCategory;

export const Route = createFileRoute('/{-$locale}/workspace/compass')({
    validateSearch: compassSearchSchema,
    loaderDeps: ({ search }) => ({
        category: search.category ?? null,
        includeDismissed: search.includeDismissed ?? false,
    }),
    loader: ({ deps }) =>
        routeLoaderGraphqlClient(WorkspaceCompassPageDocument, {
            category: deps.category,
            includeDismissed: deps.includeDismissed,
        })(),
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: pageTitle[locale],
            description: pageDescription[locale],
            path: '/workspace/compass',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceCompassPage,
});

function WorkspaceCompassPage() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const search = Route.useSearch();
    const filter: ObservationFilter = search.category ?? 'all';
    const includeDismissed = search.includeDismissed ?? false;
    const activeTab: CompassTab = search.tab ?? 'summary';
    const activeInterviewId = search.interviewId ?? null;

    // Server-authoritative state: seed once from the route loader, then let
    // the `userUpdates` subscription replace it on every server push. The
    // synthesis job publishes `userUpdates` on completion, so the page never
    // needs to poll. See `docs/architecture/state-synchronization.md` —
    // Seed-and-Subscribe.
    const user = useWorkspaceCompassPageLiveUser({ category: search.category ?? null, includeDismissed }, data.sessionFindOne.user);
    const compass = user?.admin?.adminCompassFindOne;
    if (!compass) return <WorkspaceUnauthorized locale={locale} />;

    return (
        <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-8xl mx-auto w-full pb-20">
            <header className="mt-10 mb-10">
                <p className="max-w-2xl text-base text-muted-foreground">{pageDescription[locale]}</p>
            </header>

            <SynthesisHero compass={compass} locale={locale} activeTab={activeTab} />

            {activeTab === 'interviews' ? (
                <InterviewsSection compass={compass} locale={locale} activeInterviewId={activeInterviewId} />
            ) : (
                <ObservationsSection
                    observations={compass.adminCompassObservationFindMany}
                    filter={filter}
                    includeDismissed={includeDismissed}
                    locale={locale}
                />
            )}
        </main>
    );
}

// --- Synthesis hero ---------------------------------------------------------

// Synthesis hero — three artifact tabs plus the new Interviews tab. The
// synthesis card itself only renders for the three artifact tabs; the
// Interviews tab's body lives below the hero (see `InterviewsSection`).
// Summary first because it's the one fed back to the agent — Cem should
// see it before reading further. The firewall is signposted on the psych
// tab so the meta-meaning ("this is private to me") is part of the layout.
function SynthesisHero({ compass, locale, activeTab }: { compass: CompassData; locale: Locale; activeTab: CompassTab }) {
    const [{ fetching: enqueuing }, synthesize] = useMutation(WorkspaceCompassSynthesizeRequestDocument);

    const isEmpty = !compass.summary && !compass.prose && !compass.psychology;
    // The enqueue itself takes ~50ms; the job runs for a few seconds. The
    // backend exposes the real liveness via `synthesisInProgress` (derived
    // from pg-boss), so the button reflects "actually running" rather than
    // a hand-tuned timeout. We OR `enqueuing` so the spinner appears the
    // instant the user clicks — before the server's `userUpdates` push
    // confirms the queued state.
    const running = compass.synthesisInProgress || enqueuing;
    const isInterviewsTab = activeTab === 'interviews';
    // When the Interviews tab is active, narrow the artifact body to one of
    // the three "real" artifacts so type inference holds. The Interviews
    // body renders in `InterviewsSection`, not here.
    const artifactTab: 'summary' | 'prose' | 'psychology' = isInterviewsTab ? 'summary' : activeTab;

    const synthesizedLabel = compass.synthesizedAt
        ? formatDistanceToNow(parseISO(compass.synthesizedAt as unknown as string), {
              addSuffix: true,
              locale: DATE_FNS_LOCALE[locale],
          })
        : null;

    return (
        <section aria-label={{ de: 'Synthese', en: 'Synthesis' }[locale]}>
            <TabStrip locale={locale} active={activeTab} hasPendingInterview={compass.adminCompassInterviewPendingFindOne != null} />
            {!isInterviewsTab ? (
                <div className="mt-3 flex flex-wrap justify-end gap-x-3 text-xs text-muted-foreground">
                    {synthesizedLabel ? (
                        <span>
                            {{ de: 'Synthetisiert', en: 'Synthesized' }[locale]} · {synthesizedLabel}
                        </span>
                    ) : (
                        <span>{{ de: 'Noch nicht synthetisiert', en: 'Not synthesized yet' }[locale]}</span>
                    )}
                    {compass.observationsSinceSynthesis > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                            {compass.observationsSinceSynthesis}{' '}
                            {compass.observationsSinceSynthesis === 1
                                ? { de: 'neue Beobachtung', en: 'new observation' }[locale]
                                : { de: 'neue Beobachtungen', en: 'new observations' }[locale]}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {!isInterviewsTab ? (
                <GlassCard className="mt-4 px-6 py-6 md:px-8 md:py-7">
                    {isEmpty ? <EmptyState locale={locale} /> : <ArtifactBody tab={artifactTab} compass={compass} locale={locale} />}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
                        <TabExplainer tab={artifactTab} locale={locale} />
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={running}
                            onClick={async () => {
                                await synthesize({});
                                // The server publishes `userUpdates` from the
                                // synthesis command on enqueue and from the
                                // background job on completion — both flow into
                                // the seed-and-subscribe hook without any
                                // imperative refresh from the client.
                            }}
                        >
                            <RefreshCwIcon className={cn(running && 'animate-spin')} />
                            {running
                                ? { de: 'Wird verarbeitet…', en: 'Processing…' }[locale]
                                : { de: 'Jetzt neu synthetisieren', en: 'Re-synthesize now' }[locale]}
                        </Button>
                    </div>
                </GlassCard>
            ) : null}
        </section>
    );
}

// Canonical top-of-page sub-view switcher — underlined section tabs. Same
// DOM shape and class list as `projects.tsx`, `todos.tsx`, and every other
// workspace switcher. See `docs/conventions.md` — "Top-of-page sub-view
// switcher".
function TabStrip({ locale, active, hasPendingInterview }: { locale: Locale; active: CompassTab; hasPendingInterview: boolean }) {
    const tabs: { id: CompassTab; label: { de: string; en: string }; icon: LucideIcon; badge?: boolean }[] = [
        { id: 'summary', label: { de: 'Kurz', en: 'Summary' }, icon: ShieldCheckIcon },
        { id: 'prose', label: { de: 'Porträt', en: 'Portrait' }, icon: UserRoundIcon },
        { id: 'psychology', label: { de: 'Psychologisch', en: 'Psychological' }, icon: WavesIcon },
        {
            id: 'interviews',
            label: { de: 'Interviews', en: 'Interviews' },
            icon: MessageCircleQuestionIcon,
            badge: hasPendingInterview,
        },
    ];
    return (
        <nav
            className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border/60 no-scrollbar scroll-fade-x"
            aria-label={{ de: 'Kompass-Sicht', en: 'Compass view' }[locale]}
        >
            {tabs.map((t) => {
                const isActive = active === t.id;
                const Icon = t.icon;
                return (
                    <Link
                        key={t.id}
                        to="/{-$locale}/workspace/compass"
                        from="/{-$locale}/workspace/compass"
                        // Drop `tab` on the default `summary` view to keep the
                        // canonical URL clean; drop `interviewId` whenever
                        // the user navigates away from the Interviews tab.
                        search={(prev: CompassSearch): CompassSearch => ({
                            ...prev,
                            tab: t.id === 'summary' ? undefined : t.id,
                            interviewId: t.id === 'interviews' ? prev.interviewId : undefined,
                        })}
                        replace
                        className={cn(
                            '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <Icon className="size-4" />
                        {t.label[locale]}
                        {t.badge ? <span className="ml-0.5 size-1.5 rounded-full bg-amber-500" aria-hidden="true" /> : null}
                    </Link>
                );
            })}
        </nav>
    );
}

function ArtifactBody({ tab, compass, locale }: { tab: 'summary' | 'prose' | 'psychology'; compass: CompassData; locale: Locale }) {
    const content = compass[tab];
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
    return (
        <div className="flex flex-col gap-2">
            <AssistantMarkdown text={content} className="text-base leading-relaxed" />
            <div className="flex items-center gap-1 mt-1">
                <SpeakButton text={content} />
            </div>
        </div>
    );
}

function TabExplainer({ tab, locale }: { tab: 'summary' | 'prose' | 'psychology'; locale: Locale }) {
    const explainers: Record<'summary' | 'prose' | 'psychology', { de: string; en: string; tone: 'fed' | 'private' }> = {
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
        psychology: {
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
                    {{ de: 'Dein Kompass baut sich gerade auf', en: 'Your compass is still building' }[locale]}
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
}: {
    observations: ReadonlyArray<ObservationRow>;
    filter: ObservationFilter;
    includeDismissed: boolean;
    locale: Locale;
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
                        <ObservationCard key={obs.observationId} observation={obs} locale={locale} />
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
            to="/{-$locale}/workspace/compass"
            from="/{-$locale}/workspace/compass"
            search={(prev: CompassSearch) => ({ ...prev, includeDismissed: includeDismissed ? undefined : true })}
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
                : { de: 'Verworfene anzeigen', en: 'AdminMediaShow dismissed' }[locale]}
        </Link>
    );
}

const CATEGORY_LABELS: Record<GqlCCompassObservationCategory, { de: string; en: string }> = {
    factual: { de: 'Faktisch', en: 'Factual' },
    behavioral: { de: 'Verhalten', en: 'Behavioral' },
    psychological: { de: 'Psychologisch', en: 'Psychological' },
};

const CATEGORY_ACCENT: Record<GqlCCompassObservationCategory, string> = {
    factual: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30',
    behavioral: 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30',
    psychological: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30',
};

// --- Interview topic labels / icons -----------------------------------------

const TOPIC_LABELS: Record<GqlCCompassInterviewTopic, { de: string; en: string }> = {
    general: { de: 'Allgemein', en: 'General' },
    career: { de: 'Karriere', en: 'Career' },
    relationships: { de: 'Beziehungen', en: 'Relationships' },
    fitness: { de: 'Fitness', en: 'Fitness' },
    health: { de: 'Gesundheit', en: 'Health' },
    stress: { de: 'Stress', en: 'Stress' },
};

const TOPIC_ICONS: Record<GqlCCompassInterviewTopic, LucideIcon> = {
    general: MessageCircleQuestionIcon,
    career: BriefcaseIcon,
    relationships: UsersIcon,
    fitness: DumbbellIcon,
    health: StethoscopeIcon,
    stress: ZapIcon,
};

const TOPIC_ACCENT: Record<GqlCCompassInterviewTopic, string> = {
    general: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
    career: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
    relationships: 'bg-pink-500/10 text-pink-600 dark:text-pink-300 border-pink-500/30',
    fitness: 'bg-green-500/10 text-green-600 dark:text-green-300 border-green-500/30',
    health: 'bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/30',
    stress: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/30',
};

function InterviewTopicBadge({ topic, locale }: { topic: GqlCCompassInterviewTopic; locale: Locale }) {
    const Icon = TOPIC_ICONS[topic];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border',
                TOPIC_ACCENT[topic],
            )}
        >
            <Icon className="size-3" />
            {TOPIC_LABELS[topic][locale]}
        </span>
    );
}

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
                        to="/{-$locale}/workspace/compass"
                        from="/{-$locale}/workspace/compass"
                        // "all" → drop the `category` key entirely so the canonical
                        // URL for the unfiltered view has no `?category=`.
                        search={(prev: CompassSearch) => ({
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

function ObservationCard({ observation, locale }: { observation: ObservationRow; locale: Locale }) {
    const [, dismiss] = useMutation(WorkspaceCompassObservationDismissDocument);
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
                                to="/{-$locale}/workspace/assistant/$chatId"
                                params={{ chatId: observation.sourceChatId }}
                                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <MessageSquareTextIcon className="size-3.5" />
                                {{ de: 'Quelle ansehen', en: 'View source' }[locale]}
                            </Link>
                        ) : (
                            <span className="text-muted-foreground italic">{{ de: 'Quelle gelöscht', en: 'Source deleted' }[locale]}</span>
                        )}
                        <div className="flex items-center gap-1">
                            <SpeakButton text={observation.content} />
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
                                        setBusy(false);
                                    }}
                                >
                                    {{ de: 'Verwerfen', en: 'Dismiss' }[locale]}
                                </Button>
                            )}
                        </div>
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

// Seed-and-Subscribe: the route loader provides the initial `user`, then the
// `userUpdates` subscription replaces it with the same fragment shape on every
// server push. Imperative URQL — not `useSubscription` — for the same reason
// `useChatLiveUpdates.tsx` does: URQL's declarative hook can deliver each event
// more than once under concurrent React. See `docs/architecture/state-synchronization.md`.
function useWorkspaceCompassPageLiveUser(
    variables: GqlCWorkspaceCompassPageUpdatesSubscriptionVariables,
    seed: GqlCWorkspaceCompassPageUserFragment | null | undefined,
): GqlCWorkspaceCompassPageUserFragment | null | undefined {
    const [user, setUser] = useState(seed);

    // Adopt the fresh seed when the filter changes — the route loader re-runs
    // and hands us a new payload before the new subscription has connected.
    const variablesKey = `${variables.category ?? ''}:${variables.includeDismissed ?? false}`;
    const lastKeyRef = useRef(variablesKey);
    if (lastKeyRef.current !== variablesKey) {
        lastKeyRef.current = variablesKey;
        queueMicrotask(() => setUser(seed));
    }

    const client = useClient();
    useEffect(() => {
        const request = createRequest(WorkspaceCompassPageUpdatesDocument, variables);
        const operation = client.executeSubscription<GqlCWorkspaceCompassPageUpdatesSubscription>(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                if (result.data) setUser(result.data.userUpdates);
            }),
        );
        return unsubscribe;
    }, [client, variablesKey]);

    return user;
}

// --- Interviews tab ---------------------------------------------------------
//
// Renders one of three states:
//
//   - There is no active interview and no open `pending` row →
//     a short empty state explaining how interviews work.
//   - There is an open interview (`pending` or `in_progress`) and the URL
//     does NOT pin one via `?interviewId=` → a prominent "waiting" card
//     with Start / Skip (pending) or Resume / End (in_progress).
//   - The URL pins a specific interview via `?interviewId=` → the transcript
//     + composer for that interview (live for in-progress, read-only when
//     completed/skipped).
//
// Past interviews always render as a quiet list beneath. See
// `docs/features/compass.md` ("Psychological-interview agent").
function InterviewsSection({
    compass,
    locale,
    activeInterviewId,
}: {
    compass: CompassData;
    locale: Locale;
    activeInterviewId: string | null;
}) {
    const interviews = compass.adminCompassInterviewFindMany;
    const pending = compass.adminCompassInterviewPendingFindOne;
    // The URL pin overrides everything — when set, show that interview's view.
    // Otherwise prefer the open interview if there is one. The list rail
    // shows every past interview so the user can deep-link backwards.
    const focusedFromList = activeInterviewId ? (interviews.find((i) => i.interviewId === activeInterviewId) ?? null) : null;
    const focusedFromPending = activeInterviewId && pending?.interviewId === activeInterviewId ? pending : null;
    // Past-interview rows in `interviews` are summaries (no messages); the
    // pending one carries messages. When the user clicked a past row we
    // surface a thin variant that has `messages: []` — the InterviewView
    // handles that with an empty-transcript fallback.
    const focusedInterview: InterviewWithMessages | null = focusedFromPending
        ? focusedFromPending
        : focusedFromList
          ? { ...focusedFromList, messages: [] }
          : null;

    return (
        <section className="mt-12" aria-label={{ de: 'Interviews', en: 'Interviews' }[locale]}>
            <div>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                    {{ de: 'Psychologische Interviews', en: 'Psychological interviews' }[locale]}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                    {
                        {
                            de: 'Regelmäßig stellt dir ein Interviewer-Agent gezielte Fragen, um Lücken im Kompass zu füllen. Deine Antworten landen — wie alle Beobachtungen — in der Synthese.',
                            en: "On a regular cadence an interviewer agent asks you a handful of directed questions to fill in gaps the passive analyzer can't see. Your replies feed the same observations / synthesis pipeline as regular chats.",
                        }[locale]
                    }
                </p>
            </div>

            {focusedInterview ? (
                <InterviewView interview={focusedInterview} observations={compass.adminCompassObservationFindMany} locale={locale} />
            ) : pending ? (
                <PendingInterviewCard interview={pending} locale={locale} />
            ) : (
                <NoInterviewCard locale={locale} hasHistory={interviews.length > 0} />
            )}

            {!focusedInterview && compass.scheduledInterviewTopic && compass.scheduledInterviewAt ? (
                <ScheduleHintCard
                    topic={compass.scheduledInterviewTopic}
                    scheduledAt={compass.scheduledInterviewAt as unknown as string}
                    reason={compass.scheduledInterviewReason ?? null}
                    locale={locale}
                />
            ) : null}

            <PastInterviewsRail interviews={interviews} locale={locale} activeInterviewId={activeInterviewId} />
        </section>
    );
}

function NoInterviewCard({ locale, hasHistory }: { locale: Locale; hasHistory: boolean }) {
    const navigate = useNavigate();
    const [, startNowMutation] = useMutation(WorkspaceCompassInterviewStartNowDocument);
    const [, startMutation] = useMutation(WorkspaceCompassInterviewStartDocument);
    const [busy, setBusy] = useState<GqlCCompassInterviewTopic | null>(null);

    async function startTopic(topic: GqlCCompassInterviewTopic) {
        if (busy) return;
        setBusy(topic);
        const startNowResult = await startNowMutation({ topic });
        const interviewId = startNowResult.data?.admin.compassInterviewStartNow.referenceId;
        if (interviewId) {
            await startMutation({ interviewId });
            await navigate({
                to: '/{-$locale}/workspace/compass',
                from: '/{-$locale}/workspace/compass',
                search: (prev: CompassSearch): CompassSearch => ({ ...prev, tab: 'interviews', interviewId }),
                replace: true,
            });
        }
        setBusy(null);
    }

    const topics: GqlCCompassInterviewTopic[] = ['general', 'career', 'relationships', 'fitness', 'health', 'stress'];

    return (
        <GlassCard className="mt-6 px-6 py-8">
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-foreground">
                        {hasHistory
                            ? { de: 'Kein laufendes Interview', en: 'No interview waiting' }[locale]
                            : { de: 'Noch kein Interview', en: 'No interviews yet' }[locale]}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        {
                            {
                                de: 'Wähle ein Thema und der Interviewer-Agent stellt sofort die erste Frage.',
                                en: 'Pick a topic and the interviewer will open with a focused first question.',
                            }[locale]
                        }
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {topics.map((topic) => {
                        const Icon = TOPIC_ICONS[topic];
                        const isLoading = busy === topic;
                        return (
                            <button
                                key={topic}
                                disabled={busy !== null}
                                onClick={() => startTopic(topic)}
                                className={cn(
                                    'flex flex-col items-start gap-2 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                                    busy !== null && busy !== topic ? 'opacity-40' : '',
                                    'border-border/40 hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed',
                                )}
                            >
                                <Icon className={cn('size-4', isLoading ? 'animate-pulse' : '')} />
                                <span className="font-medium text-foreground">{TOPIC_LABELS[topic][locale]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </GlassCard>
    );
}

function PendingInterviewCard({ interview, locale }: { interview: InterviewWithMessages; locale: Locale }) {
    const navigate = useNavigate();
    const [, startMutation] = useMutation(WorkspaceCompassInterviewStartDocument);
    const [, skipMutation] = useMutation(WorkspaceCompassInterviewSkipDocument);
    const [, endMutation] = useMutation(WorkspaceCompassInterviewEndDocument);
    const [busy, setBusy] = useState<'start' | 'skip' | 'end' | null>(null);

    const dueAge = useMemo(
        () =>
            formatDistanceToNow(parseISO(interview.dueAt as unknown as string), {
                addSuffix: true,
                locale: DATE_FNS_LOCALE[locale],
            }),
        [interview.dueAt, locale],
    );

    const isPending = interview.status === 'pending';

    return (
        <GlassCard className="mt-6 px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                            {isPending
                                ? { de: 'Interview wartet', en: 'Interview waiting' }[locale]
                                : { de: 'Interview läuft', en: 'Interview in progress' }[locale]}
                        </span>
                        <InterviewTopicBadge topic={interview.topic} locale={locale} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                        {isPending
                            ? { de: 'Bereit, ein paar Fragen zu beantworten?', en: 'Ready for a few directed questions?' }[locale]
                            : { de: 'Setze dein Interview fort', en: 'Resume your interview' }[locale]}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {isPending
                            ? {
                                  de: `Geplant ${dueAge}. Der Interviewer stellt 4–8 gezielte Fragen, fügt dem Kompass aber nur das hinzu, was er nicht ohnehin schon sieht.`,
                                  en: `Scheduled ${dueAge}. The interviewer asks 4–8 directed questions and only adds to the compass what it doesn't already see.`,
                              }[locale]
                            : {
                                  de: `Begonnen ${interview.startedAt ? formatDistanceToNow(parseISO(interview.startedAt as unknown as string), { addSuffix: true, locale: DATE_FNS_LOCALE[locale] }) : dueAge}.`,
                                  en: `Started ${interview.startedAt ? formatDistanceToNow(parseISO(interview.startedAt as unknown as string), { addSuffix: true, locale: DATE_FNS_LOCALE[locale] }) : dueAge}.`,
                              }[locale]}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        disabled={busy != null}
                        onClick={async () => {
                            setBusy('start');
                            if (isPending) {
                                await startMutation({ interviewId: interview.interviewId });
                            }
                            await navigate({
                                to: '/{-$locale}/workspace/compass',
                                from: '/{-$locale}/workspace/compass',
                                search: (prev: CompassSearch): CompassSearch => ({
                                    ...prev,
                                    tab: 'interviews',
                                    interviewId: interview.interviewId,
                                }),
                                replace: true,
                            });
                            setBusy(null);
                        }}
                    >
                        {isPending
                            ? { de: 'Interview starten', en: 'Start interview' }[locale]
                            : { de: 'Fortsetzen', en: 'Resume' }[locale]}
                    </Button>
                    {isPending ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy != null}
                            onClick={async () => {
                                setBusy('skip');
                                await skipMutation({ interviewId: interview.interviewId });
                                setBusy(null);
                            }}
                        >
                            {{ de: 'Überspringen', en: 'Skip' }[locale]}
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy != null}
                            onClick={async () => {
                                setBusy('end');
                                await endMutation({ interviewId: interview.interviewId });
                                setBusy(null);
                            }}
                        >
                            {{ de: 'Beenden', en: 'End' }[locale]}
                        </Button>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}

// Target upper bound the interviewer is prompted to hit — kept in sync with
// `COMPASS_INTERVIEW_MAX_QUESTIONS` in `src/server/agents/compassInterviewConfig.ts`.
// Surfaces as "Q3 / ~8" in the header so the user knows roughly how many
// questions are left. Approximate — the agent may conclude early, or push
// slightly past the ceiling; the header uses "~" to reflect that.
const COMPASS_INTERVIEW_MAX_QUESTIONS = 8;

function InterviewView({
    interview,
    observations,
    locale,
}: {
    interview: InterviewWithMessages;
    observations: ReadonlyArray<ObservationRow>;
    locale: Locale;
}) {
    const navigate = useNavigate();
    const [{ fetching: starting, error: startError }, startMutation] = useMutation(WorkspaceCompassInterviewStartDocument);
    const [{ fetching: ending }, endMutation] = useMutation(WorkspaceCompassInterviewEndDocument);

    // Per-turn live-update state — mints the `generationId`, holds streaming
    // deltas keyed by the pre-allocated assistant `interviewMessageId`, and
    // clears itself on the server's `turnEnded`. See
    // `docs/styles/chat.md`.
    const live = useCompassInterviewLiveUpdates(interview.interviewId);

    // Merge persisted messages from the loader/subscription with any rows
    // that arrived via `messageAppended` since the last hydration. Dedup by
    // id — under a slightly-stale subscription frame the same row can arrive
    // through both paths.
    const messages = useMemo(() => {
        const persisted = interview.messages;
        if (live.appendedMessages.length === 0) return persisted;
        const seen = new Set(persisted.map((m) => m.interviewMessageId));
        const extras = live.appendedMessages.filter((m) => !seen.has(m.interviewMessageId));
        return extras.length ? [...persisted, ...extras] : persisted;
    }, [interview.messages, live.appendedMessages]);

    const isActive = interview.status === 'pending' || interview.status === 'in_progress';
    const assistantQuestionCount = messages.filter((m) => m.role === 'assistant').length;
    const [startAttemptFailed, setStartAttemptFailed] = useState(false);

    const kickOffStart = useCallback(() => {
        setStartAttemptFailed(false);
        const generationId = live.beginTurn();
        void startMutation({ interviewId: interview.interviewId, generationId }).then((result) => {
            const ok = result.data?.admin.compassInterviewStart.success;
            if (result.error || !ok) {
                // Tear down the per-turn state — no turn is actually
                // running server-side — and surface a retry-able error card
                // in the transcript.
                live.endTurn();
                setStartAttemptFailed(true);
            }
        });
    }, [interview.interviewId, live, startMutation]);

    // If the interview is still `pending` (the user navigated in via a deep
    // link before clicking Start), transition it on mount so the agent's
    // opener lands automatically. Fires exactly once per interviewId — the
    // effect body checks `startAttemptFailed` so a retry-user click drives
    // the second attempt rather than the effect.
    const startedRef = useRef(false);
    useEffect(() => {
        startedRef.current = false;
    }, [interview.interviewId]);
    useEffect(() => {
        if (interview.status !== 'pending') return;
        if (startedRef.current) return;
        startedRef.current = true;
        kickOffStart();
    }, [interview.status, kickOffStart]);

    return (
        <GlassCard className="mt-6 flex flex-col gap-4 px-6 py-6 md:px-8 md:py-7">
            {live.listener}
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-base font-semibold tracking-tight flex items-center gap-2 flex-wrap">
                        <span>
                            {{ de: 'Interview', en: 'Interview' }[locale]} ·{' '}
                            <span className="text-muted-foreground font-normal">
                                {formatDistanceToNow(parseISO(interview.dueAt as unknown as string), {
                                    addSuffix: true,
                                    locale: DATE_FNS_LOCALE[locale],
                                })}
                            </span>
                        </span>
                        <InterviewTopicBadge topic={interview.topic} locale={locale} />
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <InterviewStatusBadge status={interview.status} locale={locale} />
                        {isActive && assistantQuestionCount > 0 ? (
                            <span className="tabular-nums">
                                · {{ de: 'Frage', en: 'Question' }[locale]} {assistantQuestionCount} / ~{COMPASS_INTERVIEW_MAX_QUESTIONS}
                            </span>
                        ) : null}
                        {interview.observationCount > 0 ? (
                            <span>
                                · {interview.observationCount}{' '}
                                {interview.observationCount === 1
                                    ? { de: 'Beobachtung', en: 'observation' }[locale]
                                    : { de: 'Beobachtungen', en: 'observations' }[locale]}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        to="/{-$locale}/workspace/compass"
                        from="/{-$locale}/workspace/compass"
                        search={(prev: CompassSearch): CompassSearch => ({ ...prev, interviewId: undefined })}
                        replace
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {{ de: '← Zurück zur Liste', en: '← Back to list' }[locale]}
                    </Link>
                </div>
            </header>

            {startAttemptFailed && messages.length === 0 ? (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
                    <div className="flex items-start gap-2">
                        <AlertTriangleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">
                                {
                                    {
                                        de: 'Interview konnte nicht gestartet werden.',
                                        en: "Couldn't start the interview.",
                                    }[locale]
                                }
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {startError?.message ??
                                    {
                                        de: 'Der Interviewer hat nicht geantwortet. Bitte erneut versuchen.',
                                        en: "The interviewer didn't respond. Please try again.",
                                    }[locale]}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={starting} onClick={kickOffStart}>
                        {{ de: 'Erneut versuchen', en: 'Retry' }[locale]}
                    </Button>
                </div>
            ) : (
                <CompassInterviewTranscript
                    messages={messages}
                    streamingTexts={live.streamingTexts}
                    observations={observations}
                    jumpToLatestLabel={{ de: 'Zur neuesten Nachricht', en: 'Jump to latest' }[locale]}
                    locale={locale}
                    className="max-h-[60vh]"
                />
            )}

            {isActive ? (
                <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
                    <CompassInterviewComposer
                        interviewId={interview.interviewId}
                        locale={locale}
                        isLocked={live.isGenerating}
                        beginTurn={live.beginTurn}
                        endTurn={live.endTurn}
                        autoFocus
                    />
                    <div className="flex items-center justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={ending}
                            onClick={async () => {
                                await endMutation({ interviewId: interview.interviewId });
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {{ de: 'Interview beenden', en: 'End interview' }[locale]}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground italic">
                    <span>
                        {interview.status === 'completed'
                            ? { de: 'Dieses Interview ist abgeschlossen.', en: 'This interview is complete.' }[locale]
                            : { de: 'Dieses Interview wurde übersprungen.', en: 'This interview was skipped.' }[locale]}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                            await navigate({
                                to: '/{-$locale}/workspace/compass',
                                from: '/{-$locale}/workspace/compass',
                                search: (prev: CompassSearch): CompassSearch => ({ ...prev, interviewId: undefined }),
                                replace: true,
                            });
                        }}
                    >
                        {{ de: 'Schließen', en: 'Close' }[locale]}
                    </Button>
                </div>
            )}
        </GlassCard>
    );
}

// Renders a quiet suggestion row when the AI analyzer emitted a schedule hint
// (time-sensitive signal like an upcoming decision). Dismissible without acting.
function ScheduleHintCard({
    topic,
    scheduledAt,
    reason,
    locale,
}: {
    topic: GqlCCompassInterviewTopic;
    scheduledAt: string;
    reason: string | null;
    locale: Locale;
}) {
    const navigate = useNavigate();
    const [, startNowMutation] = useMutation(WorkspaceCompassInterviewStartNowDocument);
    const [, startMutation] = useMutation(WorkspaceCompassInterviewStartDocument);
    const [, dismissMutation] = useMutation(WorkspaceCompassScheduledInterviewDismissDocument);
    const [busy, setBusy] = useState<'start' | 'dismiss' | null>(null);

    const ageLabel = useMemo(
        () =>
            formatDistanceToNow(parseISO(scheduledAt), {
                addSuffix: true,
                locale: DATE_FNS_LOCALE[locale],
            }),
        [scheduledAt, locale],
    );

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <InfoIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-medium text-foreground">
                        {
                            {
                                de: `${TOPIC_LABELS[topic].de}-Interview empfohlen`,
                                en: `${TOPIC_LABELS[topic].en} interview suggested`,
                            }[locale]
                        }{' '}
                        · <span className="font-normal text-muted-foreground">{ageLabel}</span>
                    </span>
                    <InterviewTopicBadge topic={topic} locale={locale} />
                </div>
                {reason ? <p className="text-xs text-muted-foreground pl-5">"{reason}"</p> : null}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="default"
                    size="sm"
                    disabled={busy !== null}
                    onClick={async () => {
                        setBusy('start');
                        const startNowResult = await startNowMutation({ topic });
                        const interviewId = startNowResult.data?.admin.compassInterviewStartNow.referenceId;
                        if (interviewId) {
                            await startMutation({ interviewId });
                            await navigate({
                                to: '/{-$locale}/workspace/compass',
                                from: '/{-$locale}/workspace/compass',
                                search: (prev: CompassSearch): CompassSearch => ({ ...prev, tab: 'interviews', interviewId }),
                                replace: true,
                            });
                        }
                        setBusy(null);
                    }}
                >
                    {{ de: 'Jetzt starten', en: 'Start now' }[locale]}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null}
                    onClick={async () => {
                        setBusy('dismiss');
                        await dismissMutation({});
                        setBusy(null);
                    }}
                >
                    {{ de: 'Ignorieren', en: 'Dismiss' }[locale]}
                </Button>
            </div>
        </div>
    );
}

function InterviewStatusBadge({ status, locale }: { status: InterviewSummary['status']; locale: Locale }) {
    const label: { de: string; en: string } =
        status === 'pending'
            ? { de: 'Wartet', en: 'Pending' }
            : status === 'in_progress'
              ? { de: 'Läuft', en: 'In progress' }
              : status === 'completed'
                ? { de: 'Abgeschlossen', en: 'Completed' }
                : { de: 'Übersprungen', en: 'Skipped' };
    return <span>{label[locale]}</span>;
}

function PastInterviewsRail({
    interviews,
    locale,
    activeInterviewId,
}: {
    interviews: ReadonlyArray<InterviewSummary>;
    locale: Locale;
    activeInterviewId: string | null;
}) {
    const past = interviews.filter((i) => i.status === 'completed' || i.status === 'skipped');
    if (past.length === 0) return null;

    return (
        <section className="mt-10">
            <h3 className="text-sm font-medium text-muted-foreground">{{ de: 'Frühere Interviews', en: 'Past interviews' }[locale]}</h3>
            <ul className="mt-3 flex flex-col gap-2">
                {past.map((i) => {
                    const isActive = activeInterviewId === i.interviewId;
                    return (
                        <li key={i.interviewId}>
                            <Link
                                to="/{-$locale}/workspace/compass"
                                from="/{-$locale}/workspace/compass"
                                search={(prev: CompassSearch): CompassSearch => ({
                                    ...prev,
                                    tab: 'interviews',
                                    interviewId: isActive ? undefined : i.interviewId,
                                })}
                                replace
                                className={cn(
                                    'flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm transition-colors',
                                    isActive ? 'border-primary/40 bg-primary/5' : 'border-border/40 hover:border-border hover:bg-muted/40',
                                )}
                            >
                                <span className="flex flex-col gap-1">
                                    <span className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                                        {formatDistanceToNow(parseISO(i.dueAt as unknown as string), {
                                            addSuffix: true,
                                            locale: DATE_FNS_LOCALE[locale],
                                        })}
                                        <InterviewTopicBadge topic={i.topic} locale={locale} />
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        <InterviewStatusBadge status={i.status} locale={locale} />
                                        {i.observationCount > 0 ? (
                                            <>
                                                {' · '}
                                                {i.observationCount}{' '}
                                                {i.observationCount === 1
                                                    ? { de: 'Beobachtung', en: 'observation' }[locale]
                                                    : { de: 'Beobachtungen', en: 'observations' }[locale]}
                                            </>
                                        ) : null}
                                    </span>
                                </span>
                                <MessageSquareTextIcon className="size-4 text-muted-foreground" />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
