import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
    ArrowRightIcon,
    CodeXmlIcon,
    DumbbellIcon,
    FilmIcon,
    FolderKanbanIcon,
    ReceiptTextIcon,
    StethoscopeIcon,
    WalletIcon,
} from 'lucide-react';
import { ChatComposer } from '../../../web/chat/ChatComposer';
import { useChatLiveUpdates } from '../../../web/chat/useChatLiveUpdates';
import { CardContent, CardDescription, CardTitle } from '../../../web/components/base/card';
import { GlassCard } from '../../../web/components/GlassCard';
import { Header } from '../../../web/components/Header';
import { WorkspaceChatMessageCreateDocument } from '../../../web/graphql/generated';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import type { Locale } from '../../../web/utils/locale';
import { localeFromParam } from '../../../web/utils/locale';

// TODO(phase-2): wrap this route (and every nested workspace route) in the
// GitHub-OAuth gate before pointing DNS at production. Until then `noindex`
// keeps the surface out of search engines and the public sitemap, and the
// landing page does not link here — it is reachable only by typing the URL.

const COPY = {
    hero: {
        // Title still feeds `seoMeta` and the browser tab — keep "Workspace"
        // there so the page identity is unambiguous in tabs and shared links.
        title: { de: 'Workspace', en: 'Workspace' },
        // The on-page hero is now a personal greeting + the assistant
        // composer; the older "this is my workspace" intro paragraph is gone.
        greeting: { de: 'Willkommen zurück, Cem', en: 'Welcome back, Cem' },
        intro: {
            de: 'Frag deinen Assistenten oder spring direkt in einen Themenbereich.',
            en: 'Ask your assistant, or jump straight into a focus area.',
        },
        composerPlaceholder: { de: 'Frag deinen Assistenten…', en: 'Ask your assistant…' },
    },
    areas: {
        software: {
            title: { de: 'Softwareentwicklung & Architektur', en: 'Software development & architecture' },
            description: {
                de: 'Code, Architektur-Notizen, Werkzeuge.',
                en: 'Code, architecture notes, tools.',
            },
        },
        projects: {
            title: { de: 'Projekte', en: 'Projects' },
            description: {
                de: 'Persönliche Projekte, Status und nächste Schritte.',
                en: 'Personal projects, status, and next steps.',
            },
        },
        finances: {
            title: { de: 'Finanzen', en: 'Finances' },
            description: {
                de: 'Finanzielle Ziele, Überblick, Trading und Aktien.',
                en: 'Financial goals, overview, trading and stocks.',
            },
        },
        tax: {
            title: { de: 'Steuern', en: 'Tax' },
            description: {
                de: 'Belege, Fristen, Notizen zu Steuersachen.',
                en: 'Receipts, deadlines, notes on tax matters.',
            },
        },
        fitness: {
            title: { de: 'Fitness & Wohlbefinden', en: 'Fitness & well-being' },
            description: {
                de: 'Trainingspläne, Notizen, Fortschritt.',
                en: 'Training plans, notes, progress.',
            },
        },
        medical: {
            title: { de: 'Medizinisches', en: 'Medical' },
            description: {
                de: 'Termine, Befunde und Notizen zur Gesundheit.',
                en: 'Appointments, results, and health notes.',
            },
        },
        media: {
            title: { de: 'Filme & Serien', en: 'Movies & TV shows' },
            description: {
                de: 'Watchlist und was ich zuletzt gesehen habe.',
                en: 'Watchlist and what I have watched recently.',
            },
        },
    },
    enter: { de: 'Öffnen', en: 'Open' },
};

// `admin.chatMessageCreate` returns the chat row wrapped in the admin
// namespace; pull `{ chatId }` out for `ChatComposer` to navigate on.
const extractMessageCreateResult = (data: unknown): { chatId: string } | null => {
    const wrapper = data as { admin?: { chatMessageCreate?: { chatId: string } | null } | null } | null | undefined;
    return wrapper?.admin?.chatMessageCreate ?? null;
};

const FOCUS_AREAS: ReadonlyArray<{
    key: keyof typeof COPY.areas;
    to:
        | '/{-$locale}/workspace/software'
        | '/{-$locale}/workspace/projects'
        | '/{-$locale}/workspace/finances'
        | '/{-$locale}/workspace/tax'
        | '/{-$locale}/workspace/fitness'
        | '/{-$locale}/workspace/medical'
        | '/{-$locale}/workspace/media';
    icon: typeof CodeXmlIcon;
}> = [
    { key: 'software', to: '/{-$locale}/workspace/software', icon: CodeXmlIcon },
    { key: 'projects', to: '/{-$locale}/workspace/projects', icon: FolderKanbanIcon },
    { key: 'finances', to: '/{-$locale}/workspace/finances', icon: WalletIcon },
    { key: 'tax', to: '/{-$locale}/workspace/tax', icon: ReceiptTextIcon },
    { key: 'fitness', to: '/{-$locale}/workspace/fitness', icon: DumbbellIcon },
    { key: 'medical', to: '/{-$locale}/workspace/medical', icon: StethoscopeIcon },
    { key: 'media', to: '/{-$locale}/workspace/media', icon: FilmIcon },
];

export const Route = createFileRoute('/{-$locale}/workspace/')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.hero.title[locale],
            description: COPY.hero.intro[locale],
            path: '/workspace',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: WorkspaceHub,
});

function WorkspaceHub() {
    const locale = useLocale();
    // No `chatId` yet — the hub is always the empty state for the assistant.
    // The composer creates a chat on first send, then we navigate to
    // `/workspace/assistant?chatId=<id>` where the loaded view takes over.
    // Mounting `useChatLiveUpdates(undefined)` here means the subscription
    // listener is already in place (and the user message + first assistant
    // chunks are already buffered) by the time the navigation lands.
    const live = useChatLiveUpdates(undefined);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col">
            {live.listener}
            <Header />
            {/* Bottom padding on `<main>` reserves space for the sticky composer
             * so the focus-area grid and "More to come" line are never hidden
             * underneath it on short viewports. */}
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-40">
                <AssistantGreeting locale={locale} />
                <FocusAreaGrid locale={locale} />
            </main>
            {/* Composer pinned to the viewport bottom — mirror of the
             * `sticky top-4` Header. Sibling of `<main>` so it lives at the
             * end of the document flow; `sticky bottom-4` keeps it parked
             * above the bottom edge as content scrolls beneath.
             *
             * `ProgressiveBlurBottom` sits below the composer (z-40) and
             * fades the page content into a soft blur as it approaches the
             * composer — same trick the Header uses at the top edge, just
             * mirrored — so scrolling content doesn't visibly slide behind
             * the floating surface in sharp focus. */}
            <ProgressiveBlurBottom />
            <div className="sticky bottom-4 z-50 mx-auto w-full max-w-3xl px-6 sm:px-8">
                <ChatComposer
                    isLocked={live.isGenerating}
                    beginTurn={live.beginTurn}
                    endTurn={live.endTurn}
                    onMessageSent={(chatId) => navigate({ to: '/{-$locale}/workspace/assistant', search: { chatId } })}
                    sendMutation={WorkspaceChatMessageCreateDocument}
                    extractResult={extractMessageCreateResult}
                    placeholder={COPY.hero.composerPlaceholder[locale]}
                    autoFocus
                />
            </div>
        </div>
    );
}

/* Five stacked fixed layers below the page content. Mirror of
 * `ProgressiveBlurTop` in `src/web/components/Header.tsx`, but tuned for
 * a different goal: the Header's field decorates the area ABOVE its
 * floating surface, while the composer's field has to decorate the area
 * ABOVE the composer too — the area BELOW the composer's top edge is
 * hidden by the composer's opaque `bg-white` and is wasted.
 *
 * That means the Header's curve (strongest blur at the very bottom of
 * the viewport, fading up) is wrong here — it puts the strongest blur
 * exactly where the composer covers it, leaving only the weakest 4–8px
 * blurs active where the user can actually see them. The result is what
 * the screenshot showed: content scrolling cleanly under the composer
 * with no visible softening at the top edge.
 *
 * Tuned curve for the composer:
 * - Field height `h-64` (256px) — ~145px above the composer's top edge
 *   given `sticky bottom-4` + a ~95px composer body. That headroom is
 *   what the strong blurs fade out across, so the top edge of the
 *   composer is the *peak* of the blur, not its trailing edge.
 * - Each layer's mask runs from full opacity at the field bottom up to
 *   transparent at its `to` boundary. The `to` values are pulled up so
 *   every layer (including the 64px one) is still partially active at
 *   the composer's top edge. The blur sizes are slightly stronger than
 *   the Header's so the effect reads at the composer's smaller scale.
 *
 * If a third surface ever needs this look, lift it (and `ProgressiveBlurTop`)
 * into a shared `src/web/components/ProgressiveBlur.tsx` with `direction`
 * and `tuning` props. Two callers is the smaller cost. */
function ProgressiveBlurBottom() {
    const layers = [
        { blur: '4px', to: 100 },
        { blur: '12px', to: 95 },
        { blur: '24px', to: 85 },
        { blur: '40px', to: 75 },
        { blur: '64px', to: 65 },
    ];
    return (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-64">
            {layers.map((l, i) => (
                <div
                    key={i}
                    className="absolute inset-0"
                    style={{
                        backdropFilter: `blur(${l.blur})`,
                        WebkitBackdropFilter: `blur(${l.blur})`,
                        maskImage: `linear-gradient(to top, black 0%, transparent ${l.to}%)`,
                        WebkitMaskImage: `linear-gradient(to top, black 0%, transparent ${l.to}%)`,
                    }}
                />
            ))}
        </div>
    );
}

function AssistantGreeting({ locale }: { locale: Locale }) {
    return (
        <section className="py-12 md:py-16">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">{COPY.hero.greeting[locale]}</h1>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground">{COPY.hero.intro[locale]}</p>
        </section>
    );
}

function FocusAreaGrid({ locale }: { locale: Locale }) {
    return (
        <section className="grid gap-4 md:grid-cols-2">
            {FOCUS_AREAS.map(({ key, to, icon: Icon }) => {
                const area = COPY.areas[key];
                return (
                    <Link key={key} to={to} className="group">
                        <GlassCard className="h-full py-6 transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                            <CardContent className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-primary">
                                    <Icon className="size-5" />
                                    <CardTitle className="text-xl">{area.title[locale]}</CardTitle>
                                </div>
                                <CardDescription>{area.description[locale]}</CardDescription>
                                <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                                    {COPY.enter[locale]}
                                    <ArrowRightIcon className="size-4" />
                                </span>
                            </CardContent>
                        </GlassCard>
                    </Link>
                );
            })}
        </section>
    );
}
