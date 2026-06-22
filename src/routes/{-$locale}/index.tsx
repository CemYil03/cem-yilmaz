import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import type { CodeXmlIcon } from 'lucide-react';
import {
    ArrowRightIcon,
    Building2Icon,
    CalendarClockIcon,
    FileTextIcon,
    FolderGitIcon,
    LayersIcon,
    MailIcon,
    RocketIcon,
    SendIcon,
    SparklesIcon,
    UserRoundIcon,
    WorkflowIcon,
} from 'lucide-react';
import { personalInfo } from '../../web/content/personalInfo';
import { useVisitorChat } from '../../web/chat/VisitorChatProvider';
import { Button } from '../../web/components/base/button';
import { CardContent, CardDescription, CardTitle } from '../../web/components/base/card';
import { Footer } from '../../web/components/Footer';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { MessageComposer } from '../../web/components/MessageComposer';
import { Reveal } from '../../web/components/Reveal';
import { HomePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';
import { jsonLdScripts } from '../../web/seo/jsonLd';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';
import type { Locale } from '../../web/utils/locale';

/* ----------------------------------------------------------------------------
 * Public landing page. Doubles as Cem's marketing surface — positions him as a
 * freelance consultant for business-process digitalisation and AI workflows,
 * and as a developing architect available for web projects.
 *
 * Structure (top → bottom):
 *   1. Hero — eyebrow, headline, sub-headline, body, and the AI assistant
 *      composer as the page's primary affordance. The chat is the CTA — the
 *      page itself is a demo of an AI workflow Cem builds. Submitting (or
 *      clicking a suggestion chip) opens a Dialog with the live chat surface.
 *   2. Services — three pillars (digitalisation, AI workflows, web/arch).
 *   3. Why me — enterprise depth + startup speed (peopleeat) side by side.
 *      This is the single proof section; the standalone proof strip and the
 *      standalone assistant section were folded into Hero and WhyMe.
 *   4. Call to action — availability badge + primary buttons that seed the
 *      chat with a project / intro-call prompt, plus a mailto fallback for
 *      visitors who prefer email.
 *   5. Explore — secondary nav cards (About / CV / Projects).
 *   6. Footer — contact + legal.
 *
 * All visitor-facing copy lives in the single `COPY` constant below, keyed by
 * locale. No i18n library — see docs/architecture/i18n.md.
 * ------------------------------------------------------------------------- */

const PRIMARY_EMAIL = personalInfo.contact.emails[0] ?? '';

const COPY = {
    hero: {
        eyebrow: {
            de: 'Freelance · Beratung & Architektur',
            en: 'Freelance · Consulting & Architecture',
        },
        headline: {
            de: 'Digitalisierung, KI-Workflows und Web-Architektur.',
            en: 'Digitalisation, AI workflows and web architecture.',
        },
        subheadline: {
            de: 'Digitalisierung und KI für Unternehmen, die liefern müssen.',
            en: 'Digitalisation and AI for companies that need to ship.',
        },
        body: {
            de: 'Manuelle Abläufe werden zu sauberen digitalen Workflows — und KI kommt dort zum Einsatz, wo sie messbar Wert schafft. Dazu kommen klassische Webprojekte, freiberuflich begleitet als Architekt und Entwickler.',
            en: 'Manual operations turn into clean digital workflows — and AI gets embedded exactly where it measurably pays off. Plus classic web projects, taken on freelance as architect and developer.',
        },
        assistantName: { de: 'KI-Assistent von Cem', en: 'Cem’s assistant' },
        assistantStatus: { de: 'jetzt verfügbar · rund um die Uhr', en: 'available now · around the clock' },
        placeholder: { de: 'Stelle deine Frage…', en: 'Ask your question…' },
        send: { de: 'Senden', en: 'Send' },
        suggestionsLabel: { de: 'Beliebte Fragen', en: 'Popular questions' },
        suggestions: [
            {
                de: 'Kann ich dich für ein Projekt buchen?',
                en: 'Can I hire you for a project?',
            },
            {
                de: 'Wie läuft eine Zusammenarbeit ab?',
                en: 'How does an engagement work?',
            },
            {
                de: 'Was hast du bei peopleeat gebaut?',
                en: 'What did you build at peopleeat?',
            },
            {
                de: 'Wo hat KI in meinem Unternehmen den größten Hebel?',
                en: 'Where does AI have the biggest leverage in my business?',
            },
        ],
        disclaimer: {
            de: 'Schildere dein Anliegen direkt im Chat — der Assistent leitet konkrete Anfragen an Cem weiter.',
            en: 'Share your request in the chat — the assistant forwards concrete enquiries to Cem.',
        },
    },
    services: {
        heading: { de: 'Schwerpunkte', en: 'Focus areas' },
        subheading: {
            de: 'Drei Schwerpunkte. Wähle einen — oder kombiniere sie zu einem Programm, das zu deinem Unternehmen passt.',
            en: 'Three focus areas. Pick one — or combine them into a programme that fits your business.',
        },
        items: [
            {
                icon: WorkflowIcon,
                title: { de: 'Prozess-Digitalisierung', en: 'Process digitalisation' },
                description: {
                    de: 'Excel-Workarounds, manuelle Übergaben und E-Mail-Pingpong durch saubere interne Tools ersetzen. Vom Pain Point über die Lösungsskizze bis zur produktiven Software.',
                    en: 'Replace Excel workarounds, manual handovers and email ping-pong with clean internal tools. From the pain point through the solution sketch to production software.',
                },
                bullets: {
                    de: [
                        'Excel-Workarounds raus, internes Tool rein',
                        'Stunden Bearbeitungszeit pro Vorgang gespart',
                        'Eine saubere Datenquelle statt drei',
                    ],
                    en: [
                        'Excel workarounds out, internal tool in',
                        'Hours saved per case, every case',
                        'One clean source of truth instead of three',
                    ],
                },
            },
            {
                icon: SparklesIcon,
                title: { de: 'KI-Workflows', en: 'AI workflows' },
                description: {
                    de: 'Sprachmodelle und Agenten dort einbauen, wo sie messbar Zeit sparen oder neue Produktwerte schaffen — Assistenten, Dokumenten-Pipelines, RAG, automatische Triage.',
                    en: 'Embed language models and agents where they measurably save time or open new product value — assistants, document pipelines, RAG, auto-triage.',
                },
                bullets: {
                    de: [
                        'Wiederkehrende Aufgaben übernimmt ein Assistent',
                        'Wissen aus PDFs und Wikis wird abrufbar — per Frage statt per Suche',
                        'KI läuft produktiv im Stack, nicht im Sandbox-Demo',
                    ],
                    en: [
                        'Recurring tasks handled by an assistant',
                        'Knowledge in PDFs and wikis becomes ask-able, not just searchable',
                        'AI running in production, not stuck in a sandbox demo',
                    ],
                },
            },
            {
                icon: LayersIcon,
                title: { de: 'Web-Architektur & -Entwicklung', en: 'Web architecture & development' },
                description: {
                    de: 'Klassische Webprojekte als freiberuflicher Architekt oder Full-Stack-Engineer. Von der Produktidee bis zur Produktion oder eingebettet in dein bestehendes Team.',
                    en: 'Standard web projects as a freelance architect or full-stack engineer. From product idea to production, or embedded with your existing team.',
                },
                bullets: {
                    de: [
                        'Ein neues Produkt live — vom leeren Repo zur ersten Nutzergruppe',
                        'Eine Architektur, die in drei Jahren noch trägt',
                        'Technische Führung auf Zeit, ohne ein Senior-Gehalt fest zu binden',
                    ],
                    en: [
                        'A new product live — from empty repo to first user cohort',
                        'An architecture that still holds in three years',
                        'Technical leadership on demand, without locking in a senior salary',
                    ],
                },
            },
        ],
    },
    cta: {
        availability: {
            de: 'Aktuell Kapazität für 1 Projekt ab {month}',
            en: 'Currently capacity for 1 project from {month}',
        },
        heading: {
            de: 'Reden wir über dein Projekt',
            en: 'Let’s talk about your project',
        },
        subheading: {
            de: 'Skizziere kurz, woran du gerade arbeitest — der Assistent stellt ein paar gezielte Fragen, fasst das Briefing zusammen und schickt es mir per E-Mail. Du bekommst eine Antwort von mir, in der Regel innerhalb von 24 Stunden.',
            en: 'Describe what you’re working on in a few sentences — the assistant asks a couple of focused questions, summarises the brief and sends it to me by email. You hear back from me, usually within 24 hours.',
        },
        primary: {
            label: { de: 'Projekt anfragen', en: 'Request a project' },
            seed: {
                de: 'Ich möchte ein Projekt mit Cem besprechen.',
                en: 'I’d like to discuss a project with Cem.',
            },
        },
        secondary: {
            label: { de: 'Erstgespräch buchen', en: 'Book an intro call' },
            seed: {
                de: 'Ich würde gerne ein kurzes Erstgespräch mit Cem vereinbaren.',
                en: 'I’d like to schedule a short intro call with Cem.',
            },
        },
        emailLabel: {
            de: 'Lieber direkt per E-Mail',
            en: 'Prefer email instead',
        },
    },
    whyMe: {
        heading: { de: 'Tiefe und Tempo', en: 'Depth and speed' },
        subheading: {
            de: 'Enterprise-Disziplin trifft auf Startup-Geschwindigkeit. Saubere Audit-Trails dort, wo der Prozess sie braucht — und „in zwei Wochen live", wenn das die wichtigere Kennzahl ist.',
            en: 'Enterprise discipline meets startup speed. Clean audit trails where the process demands them — and "live in two weeks" when that is the metric that matters.',
        },
        enterprise: {
            icon: Building2Icon,
            title: { de: 'Enterprise-Tiefe', en: 'Enterprise depth' },
            body: {
                de: 'Langjährige Enterprise-Erfahrung in großen, regulierten Umgebungen: komplexe Domänen, kritische Integrationen, langlebige Codebasen. Software, die fünf Jahre lang wartbar bleiben muss — gebaut mit dem entsprechenden Anspruch.',
                en: 'Years of enterprise experience inside large, regulated environments: complex domains, critical integrations, long-lived codebases. Software built to the standard required when it has to be maintained for five years.',
            },
        },
        startup: {
            icon: RocketIcon,
            title: { de: 'Startup-Tempo · peopleeat', en: 'Startup speed · peopleeat' },
            body: {
                de: 'Gründungs-Architekt einer Food-Tech-Plattform — Architekturentscheidungen unter Unsicherheit, schnelle Iterationen, MVP zu Produkt. Liefern, ohne den nächsten Schritt zu verbauen.',
                en: 'Founding architect of a food-tech platform — architecture calls under uncertainty, fast iterations, MVP to product. Shipping without painting the next step into a corner.',
            },
        },
    },
    explore: {
        heading: { de: 'Mehr über mich', en: 'More about me' },
        subheading: {
            de: 'Schau dich um — wer ich bin, was ich gebaut habe und wie meine Stationen aussahen.',
            en: 'Look around — who I am, what I have built, and where I have worked.',
        },
        about: {
            title: { de: 'Über mich', en: 'About me' },
            description: {
                de: 'Wer ich bin, was ich kann und wie du mich erreichst.',
                en: 'Who I am, what I do, and how to reach me.',
            },
            cta: { de: 'Mehr erfahren', en: 'Read more' },
        },
        cv: {
            title: { de: 'Lebenslauf', en: 'CV' },
            description: {
                de: 'Stationen, Skills und Ausbildung — chronologisch.',
                en: 'Roles, skills, and education — in chronological order.',
            },
            cta: { de: 'Lebenslauf ansehen', en: 'View CV' },
        },
        projects: {
            title: { de: 'Projekte', en: 'Projects' },
            description: {
                de: 'Eine Auswahl meiner Projekte — die, die ich öffentlich zeigen kann.',
                en: 'A selection of my projects — the ones I can share publicly.',
            },
            cta: { de: 'Projekte ansehen', en: 'View projects' },
        },
    },
};

// Search params for the homepage. `?ask=…` deep-links into the visitor chat
// dialog, preseeded with the supplied question. AI search engines (and
// shareable links) can hand off a question directly: e.g. ChatGPT can answer
// "tell me about Cem" with a `[ask Cem's own assistant](…/?ask=tell+me+more)`
// citation. Trimmed to 500 chars to keep URLs reasonable and avoid abuse.
const homeSearchSchema = z.object({
    ask: z.string().trim().min(1).max(500).optional(),
});

export const Route = createFileRoute('/{-$locale}/')({
    loader: () => routeLoaderGraphqlClient(HomePageDocument)(),
    staleTime: 0,
    validateSearch: homeSearchSchema,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        const webPageUrl = webPageUrlGet();
        const seo = seoMeta({
            title: {
                de: 'Cem Yilmaz — Beratung für Digitalisierung & KI · Freelance Software-Architekt',
                en: 'Cem Yilmaz — Digitalisation & AI consulting · Freelance software architect',
            }[locale],
            description: COPY.hero.body[locale],
            path: '/',
            locale,
            webPageUrl,
        });
        // Homepage carries the site-level structured data — WebSite + Person
        // — so search engines can attribute brand, knowledge-panel facts, and
        // social profiles to Cem. See src/web/seo/jsonLd.ts.
        return {
            ...seo,
            scripts: jsonLdScripts(webPageUrl).map((script) => ({
                type: script.type,
                children: script.children,
            })),
        };
    },
    component: HomePage,
});

function HomePage() {
    const locale = useLocale();
    const { ask } = Route.useSearch();
    const { openWithMessage } = useVisitorChat();

    function openChat(text: string) {
        const trimmed = text.trim();
        if (trimmed.length === 0) return;
        openWithMessage(trimmed);
    }

    // `?ask=…` deep-link: fire once on mount when the search param is present.
    // Effect runs only when `ask` actually changes, so client-side navigation
    // back to `/` (after the chat opened) does not re-trigger. The dialog
    // dedupes on its end too via the `intent` state machine.
    useEffect(() => {
        if (ask) openWithMessage(ask);
    }, [ask, openWithMessage]);

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full">
                <Hero locale={locale} onOpenChat={openChat} />
                <Services locale={locale} />
                <WhyMe locale={locale} />
                <CallToAction locale={locale} onOpenChat={openChat} />
                <Explore locale={locale} />
            </main>
            <Footer />
            {/* Dialog is mounted at the root layout — see `__root.tsx`. The
             *  `openWithMessage` call above seeds it with the hero composer's
             *  question; the header chat button opens it empty. */}
        </div>
    );
}

function Hero({ locale, onOpenChat }: { locale: Locale; onOpenChat: (text: string) => void }) {
    const portraitAlt = {
        de: 'Porträt von Cem Yilmaz',
        en: 'Portrait of Cem Yilmaz',
    }[locale];

    const [question, setQuestion] = useState('');

    return (
        <section className="py-12 md:py-16">
            <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
                <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/40 px-3 py-1 text-xs font-medium tracking-wide text-foreground/80 backdrop-blur-md dark:border-white/10 dark:bg-white/4">
                        <SparklesIcon className="size-3.5 text-primary" />
                        {COPY.hero.eyebrow[locale]}
                    </span>
                    <h1 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">{COPY.hero.headline[locale]}</h1>
                    <p className="mt-4 max-w-2xl text-lg md:text-xl text-foreground/90 leading-snug">{COPY.hero.subheadline[locale]}</p>
                    <p className="mt-5 max-w-3xl text-base md:text-lg leading-relaxed text-foreground/75">{COPY.hero.body[locale]}</p>
                </div>
                <HeroPortrait alt={portraitAlt} />
            </div>

            <div className="mt-10 md:mt-12">
                <GlassCard className="px-5 py-5 md:px-6 md:py-6">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <SparklesIcon className="size-4" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold tracking-tight">{COPY.hero.assistantName[locale]}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/65">
                                <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse-dot" aria-hidden />
                                {COPY.hero.assistantStatus[locale]}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <MessageComposer
                            value={question}
                            onValueChange={setQuestion}
                            onSubmit={() => onOpenChat(question)}
                            placeholder={COPY.hero.placeholder[locale]}
                            sendLabel={COPY.hero.send[locale]}
                            rows={3}
                        />
                    </div>

                    <div className="mt-5">
                        <div className="text-xs font-medium tracking-[0.18em] uppercase text-foreground/60">
                            {COPY.hero.suggestionsLabel[locale]}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {COPY.hero.suggestions.map((s) => (
                                <button
                                    key={s.en}
                                    type="button"
                                    onClick={() => onOpenChat(s[locale])}
                                    className="rounded-full border border-white/55 bg-white/40 px-4 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-white/70 hover:text-foreground active:bg-white/80 active:text-foreground dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/8 dark:active:bg-white/12 cursor-pointer"
                                >
                                    {s[locale]}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassCard>

                <p className="mt-4 text-center text-xs text-foreground/55">{COPY.hero.disclaimer[locale]}</p>
            </div>
        </section>
    );
}

function HeroPortrait({ alt }: { alt: string }) {
    return (
        <div className="relative mx-auto md:mx-0">
            <div
                aria-hidden
                className="absolute -inset-3 rounded-full bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-2xl animate-portrait-halo"
            />
            <div className="relative size-40 overflow-hidden rounded-full border border-white/60 bg-white/40 shadow-xl backdrop-blur-md sm:size-44 md:size-52 lg:size-60 dark:border-white/10 dark:bg-white/4">
                <img
                    src="/profile-picture.png"
                    alt={alt}
                    width={640}
                    height={640}
                    className="size-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                />
            </div>
        </div>
    );
}

function Services({ locale }: { locale: Locale }) {
    return (
        <section className="pb-12 md:pb-16">
            <Reveal>
                <SectionHeading title={COPY.services.heading[locale]} subtitle={COPY.services.subheading[locale]} />
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                {COPY.services.items.map((item, i) => (
                    <Reveal key={item.title.en} index={i} className="h-full">
                        <ServiceCard
                            icon={item.icon}
                            title={item.title[locale]}
                            description={item.description[locale]}
                            bullets={item.bullets[locale]}
                        />
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function ServiceCard({
    icon: Icon,
    title,
    description,
    bullets,
}: {
    icon: typeof CodeXmlIcon;
    title: string;
    description: string;
    bullets: ReadonlyArray<string>;
}) {
    return (
        <GlassCard className="h-full py-6">
            <CardContent className="flex h-full flex-col gap-3">
                <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="leading-relaxed">{description}</CardDescription>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm text-foreground/75">
                    {bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                            <ArrowRightIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span>{b}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </GlassCard>
    );
}

function WhyMe({ locale }: { locale: Locale }) {
    return (
        <section className="pb-12 md:pb-16">
            <Reveal>
                <SectionHeading title={COPY.whyMe.heading[locale]} subtitle={COPY.whyMe.subheading[locale]} />
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
                <Reveal index={0} className="h-full">
                    <WhyMeCard
                        icon={COPY.whyMe.enterprise.icon}
                        title={COPY.whyMe.enterprise.title[locale]}
                        body={COPY.whyMe.enterprise.body[locale]}
                    />
                </Reveal>
                <Reveal index={1} className="h-full">
                    <WhyMeCard
                        icon={COPY.whyMe.startup.icon}
                        title={COPY.whyMe.startup.title[locale]}
                        body={COPY.whyMe.startup.body[locale]}
                    />
                </Reveal>
            </div>
        </section>
    );
}

function WhyMeCard({ icon: Icon, title, body }: { icon: typeof CodeXmlIcon; title: string; body: string }) {
    return (
        <GlassCard className="h-full py-6">
            <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-primary">
                    <Icon className="size-5" />
                    <CardTitle className="text-lg">{title}</CardTitle>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{body}</p>
            </CardContent>
        </GlassCard>
    );
}

function CallToAction({ locale, onOpenChat }: { locale: Locale; onOpenChat: (text: string) => void }) {
    const monthLabel = availabilityMonthLabel(locale);
    const availability = COPY.cta.availability[locale].replace('{month}', monthLabel);

    return (
        <section className="pb-12 md:pb-16">
            <Reveal>
                <GlassCard className="px-6 py-8 md:px-10 md:py-10">
                    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
                        <div className="max-w-2xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/40 px-3 py-1 text-xs font-medium tracking-wide text-foreground/80 backdrop-blur-md dark:border-white/10 dark:bg-white/4">
                                <CalendarClockIcon className="size-3.5 text-primary" />
                                {availability}
                            </span>
                            <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">{COPY.cta.heading[locale]}</h2>
                            <p className="mt-3 text-sm md:text-base text-foreground/75 leading-relaxed">{COPY.cta.subheading[locale]}</p>
                        </div>
                        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[16rem]">
                            <Button type="button" size="lg" onClick={() => onOpenChat(COPY.cta.primary.seed[locale])} className="w-full">
                                <SendIcon className="size-4" />
                                {COPY.cta.primary.label[locale]}
                            </Button>
                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                onClick={() => onOpenChat(COPY.cta.secondary.seed[locale])}
                                className="w-full"
                            >
                                <CalendarClockIcon className="size-4" />
                                {COPY.cta.secondary.label[locale]}
                            </Button>
                            {PRIMARY_EMAIL.length > 0 && (
                                <a
                                    href={`mailto:${PRIMARY_EMAIL}`}
                                    className="mt-1 inline-flex items-center justify-center gap-2 text-xs text-foreground/65 transition-colors hover:text-primary"
                                >
                                    <MailIcon className="size-3.5" />
                                    {COPY.cta.emailLabel[locale]}
                                </a>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </Reveal>
        </section>
    );
}

/**
 * Localised name of the month one calendar month from today — used by the CTA
 * availability badge so it advances automatically. `de` → `"Juli 2026"`, `en` →
 * `"July 2026"`.
 */
function availabilityMonthLabel(locale: Locale): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const formatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        month: 'long',
        year: 'numeric',
    });
    return formatter.format(next);
}

function Explore({ locale }: { locale: Locale }) {
    const items: ReadonlyArray<{
        to: '/{-$locale}/about' | '/{-$locale}/cv' | '/{-$locale}/projects';
        icon: typeof CodeXmlIcon;
        title: string;
        description: string;
        cta: string;
    }> = [
        {
            to: '/{-$locale}/about',
            icon: UserRoundIcon,
            title: COPY.explore.about.title[locale],
            description: COPY.explore.about.description[locale],
            cta: COPY.explore.about.cta[locale],
        },
        {
            to: '/{-$locale}/cv',
            icon: FileTextIcon,
            title: COPY.explore.cv.title[locale],
            description: COPY.explore.cv.description[locale],
            cta: COPY.explore.cv.cta[locale],
        },
        {
            to: '/{-$locale}/projects',
            icon: FolderGitIcon,
            title: COPY.explore.projects.title[locale],
            description: COPY.explore.projects.description[locale],
            cta: COPY.explore.projects.cta[locale],
        },
    ];

    return (
        <section className="pb-16">
            <Reveal>
                <SectionHeading title={COPY.explore.heading[locale]} subtitle={COPY.explore.subheading[locale]} />
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
                {items.map((item, i) => (
                    <Reveal key={item.to} index={i} className="h-full">
                        <NavCard to={item.to} icon={item.icon} title={item.title} description={item.description} cta={item.cta} />
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-3 text-sm md:text-base text-foreground/75 leading-relaxed">{subtitle}</p>
        </div>
    );
}

function NavCard({
    to,
    icon: Icon,
    title,
    description,
    cta,
}: {
    to: '/{-$locale}/about' | '/{-$locale}/cv' | '/{-$locale}/projects';
    icon: typeof CodeXmlIcon;
    title: string;
    description: string;
    cta: string;
}) {
    return (
        <Link to={to} className="group">
            <GlassCard className="h-full py-6 transition-colors hover:bg-white/55 active:bg-white/65 dark:hover:bg-white/8 dark:active:bg-white/12">
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                        <Icon className="size-5" />
                        <CardTitle className="text-xl">{title}</CardTitle>
                    </div>
                    <CardDescription>{description}</CardDescription>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium">
                        {cta}
                        <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                    </span>
                </CardContent>
            </GlassCard>
        </Link>
    );
}
