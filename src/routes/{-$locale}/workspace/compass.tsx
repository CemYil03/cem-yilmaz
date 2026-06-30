import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import {
    BrainIcon,
    EyeOffIcon,
    InfoIcon,
    MessageCircleQuestionIcon,
    MessageSquareTextIcon,
    RefreshCwIcon,
    SendIcon,
    ShieldCheckIcon,
    UserRoundIcon,
    WavesIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';
import { z } from 'zod';
import { AssistantMarkdown } from '../../../web/components/AssistantMarkdown';
import { Button } from '../../../web/components/base/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../web/components/base/tooltip';
import { GlassCard } from '../../../web/components/GlassCard';
import { WorkspaceUnauthorized } from '../../../web/components/WorkspaceUnauthorized';
import type {
    GqlCCompassObservationCategory,
    GqlCWorkspaceCompassInterviewSummaryFragment,
    GqlCWorkspaceCompassInterviewWithMessagesFragment,
    GqlCWorkspaceCompassPageUpdatesSubscription,
    GqlCWorkspaceCompassPageUpdatesSubscriptionVariables,
    GqlCWorkspaceCompassPageUserFragment,
} from '../../../web/graphql/generated';
import {
    WorkspaceCompassInterviewEndDocument,
    WorkspaceCompassInterviewMessageSendDocument,
    WorkspaceCompassInterviewSkipDocument,
    WorkspaceCompassInterviewStartDocument,
    WorkspaceCompassObservationDismissDocument,
    WorkspaceCompassPageDocument,
    WorkspaceCompassPageUpdatesDocument,
    WorkspaceCompassSynthesizeRequestDocument,
} from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { cn } from '../../../web/utils/cn';
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

const DATE_FNS_LOCALE: Record<Locale, typeof deLocale> = { de: deLocale, en: enLocale };

type CompassQueryData = NonNullable<GqlCWorkspaceCompassPageUserFragment['admin']>;
type CompassData = CompassQueryData['compass'];
type ObservationRow = CompassData['observations'][number];
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
    interviewId: z.string().uuid().optional(),
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
    const user = useWorkspaceCompassPageLiveUser({ category: search.category ?? null, includeDismissed }, data.currentSession.user);
    const compass = user?.admin?.compass;
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
                    observations={compass.observations}
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
            <div className="flex flex-wrap items-end justify-between gap-4">
                <TabStrip locale={locale} active={activeTab} hasPendingInterview={compass.interviewPending != null} />
                {!isInterviewsTab ? (
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
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
            </div>

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
        <div
            role="tablist"
            aria-label={{ de: 'Kompass-Sicht', en: 'Compass view' }[locale]}
            className="flex gap-1 rounded-lg bg-muted/40 p-1"
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
                        role="tab"
                        aria-selected={isActive}
                        className={cn(
                            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                        )}
                    >
                        <Icon className="size-3.5" />
                        {t.label[locale]}
                        {t.badge ? <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" /> : null}
                    </Link>
                );
            })}
        </div>
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
    return <AssistantMarkdown text={content} className="text-base leading-relaxed" />;
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
                : { de: 'Verworfene anzeigen', en: 'Show dismissed' }[locale]}
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
    const interviews = compass.interviews;
    const pending = compass.interviewPending;
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
                            de: 'Wöchentlich stellt dir ein Interviewer-Agent gezielte Fragen, um Lücken im Kompass zu füllen. Deine Antworten landen — wie alle Beobachtungen — in der Synthese.',
                            en: "Once a week an interviewer agent asks you a handful of directed questions to fill in gaps the passive analyzer can't see. Your replies feed the same observations / synthesis pipeline as regular chats.",
                        }[locale]
                    }
                </p>
            </div>

            {focusedInterview ? (
                <InterviewView interview={focusedInterview} locale={locale} />
            ) : pending ? (
                <PendingInterviewCard interview={pending} locale={locale} />
            ) : (
                <NoInterviewCard locale={locale} hasHistory={interviews.length > 0} />
            )}

            <PastInterviewsRail interviews={interviews} locale={locale} activeInterviewId={activeInterviewId} />
        </section>
    );
}

function NoInterviewCard({ locale, hasHistory }: { locale: Locale; hasHistory: boolean }) {
    return (
        <GlassCard className="mt-6 px-6 py-8 text-center">
            <div className="mx-auto max-w-md flex flex-col items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <MessageCircleQuestionIcon className="size-6" />
                </div>
                <h3 className="font-semibold text-foreground">
                    {hasHistory
                        ? { de: 'Kein laufendes Interview', en: 'No interview waiting' }[locale]
                        : { de: 'Noch kein Interview', en: 'No interviews yet' }[locale]}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Das nächste planmäßige Interview erscheint hier automatisch, sobald der Wochen-Cron es einplant.',
                            en: 'The next scheduled interview will surface here automatically when the weekly cron creates it.',
                        }[locale]
                    }
                </p>
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
                    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                        {isPending
                            ? { de: 'Interview wartet', en: 'Interview waiting' }[locale]
                            : { de: 'Interview läuft', en: 'Interview in progress' }[locale]}
                    </span>
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
                            {{ de: 'Diese Woche überspringen', en: 'Skip this week' }[locale]}
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

function InterviewView({ interview, locale }: { interview: InterviewWithMessages; locale: Locale }) {
    const navigate = useNavigate();
    const [{ fetching: sending }, sendMutation] = useMutation(WorkspaceCompassInterviewMessageSendDocument);
    const [, startMutation] = useMutation(WorkspaceCompassInterviewStartDocument);
    const [, endMutation] = useMutation(WorkspaceCompassInterviewEndDocument);
    const [draft, setDraft] = useState('');
    const transcriptRef = useRef<HTMLDivElement | null>(null);

    const isActive = interview.status === 'pending' || interview.status === 'in_progress';
    const messageCount = interview.messages.length;

    // The page subscription replaces `interview.messages` on every server
    // push. Scroll the transcript when the count grows.
    useEffect(() => {
        const el = transcriptRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messageCount]);

    // If the interview is still `pending` (the user navigated in via a deep
    // link before clicking Start), transition it on mount so the agent's
    // opener lands automatically.
    useEffect(() => {
        if (interview.status === 'pending') {
            void startMutation({ interviewId: interview.interviewId });
        }
    }, [interview.interviewId, interview.status, startMutation]);

    return (
        <GlassCard className="mt-6 px-6 py-6 md:px-8 md:py-7">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
                <div>
                    <h3 className="text-base font-semibold tracking-tight">
                        {{ de: 'Interview', en: 'Interview' }[locale]} ·{' '}
                        <span className="text-muted-foreground font-normal">
                            {formatDistanceToNow(parseISO(interview.dueAt as unknown as string), {
                                addSuffix: true,
                                locale: DATE_FNS_LOCALE[locale],
                            })}
                        </span>
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        <InterviewStatusBadge status={interview.status} locale={locale} />
                        {interview.observationCount > 0 ? (
                            <>
                                {' · '}
                                {interview.observationCount}{' '}
                                {interview.observationCount === 1
                                    ? { de: 'Beobachtung', en: 'observation' }[locale]
                                    : { de: 'Beobachtungen', en: 'observations' }[locale]}
                            </>
                        ) : null}
                    </p>
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
                    {isActive ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                await endMutation({ interviewId: interview.interviewId });
                            }}
                        >
                            {{ de: 'Interview beenden', en: 'End interview' }[locale]}
                        </Button>
                    ) : null}
                </div>
            </header>

            <div
                ref={transcriptRef}
                className="mt-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2"
                aria-label={{ de: 'Transkript', en: 'Transcript' }[locale]}
            >
                {messageCount === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                        {
                            {
                                de: 'Warte einen Moment — der Interviewer formuliert die erste Frage.',
                                en: 'Hold on — the interviewer is composing the first question.',
                            }[locale]
                        }
                    </p>
                ) : (
                    interview.messages.map((m) => (
                        <div
                            key={m.interviewMessageId}
                            className={cn(
                                'rounded-lg px-4 py-3 text-sm leading-relaxed',
                                m.role === 'user' ? 'bg-primary/10 self-end max-w-[80%]' : 'bg-muted/60 self-start max-w-[80%]',
                            )}
                        >
                            <AssistantMarkdown text={m.content} />
                        </div>
                    ))
                )}
            </div>

            {isActive ? (
                <form
                    className="mt-4 flex items-end gap-2 border-t border-border/40 pt-4"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const trimmed = draft.trim();
                        if (!trimmed || sending) return;
                        setDraft('');
                        await sendMutation({ interviewId: interview.interviewId, content: trimmed });
                    }}
                >
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={2}
                        placeholder={{ de: 'Deine Antwort…', en: 'Your reply…' }[locale]}
                        className="flex-1 resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onKeyDown={(event) => {
                            // Submit on plain Enter, leave Shift+Enter for newlines.
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                event.currentTarget.form?.requestSubmit();
                            }
                        }}
                    />
                    <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                        <SendIcon className="size-3.5" />
                        {{ de: 'Senden', en: 'Send' }[locale]}
                    </Button>
                </form>
            ) : (
                <div className="mt-4 border-t border-border/40 pt-4 text-xs text-muted-foreground italic flex items-center justify-between">
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
                                <span className="flex flex-col">
                                    <span className="font-medium text-foreground">
                                        {formatDistanceToNow(parseISO(i.dueAt as unknown as string), {
                                            addSuffix: true,
                                            locale: DATE_FNS_LOCALE[locale],
                                        })}
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
