import { useState } from 'react';
import type { FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
    ArrowRightIcon,
    BotIcon,
    BriefcaseIcon,
    Building2Icon,
    CodeXmlIcon,
    FileTextIcon,
    FolderGitIcon,
    LayersIcon,
    MailIcon,
    MessageSquareIcon,
    RocketIcon,
    SendHorizontalIcon,
    SparklesIcon,
    UserRoundIcon,
    WorkflowIcon,
} from 'lucide-react';
import { personalInfo } from '../../web/content/personalInfo';
import { Button } from '../../web/components/base/button';
import { CardContent, CardDescription, CardTitle } from '../../web/components/base/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../web/components/base/dialog';
import { Textarea } from '../../web/components/base/textarea';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { HomePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';
import type { Locale } from '../../web/utils/locale';

/* ----------------------------------------------------------------------------
 * Public landing page. Doubles as Cem's marketing surface — positions him as a
 * freelance consultant for business-process digitalisation and AI workflows,
 * and as a developing architect available for web projects. SAP and peopleeat
 * are the proof points: enterprise scale on one side, startup speed on the
 * other.
 *
 * Structure (top → bottom):
 *   1. Hero — eyebrow, headline, subhead, two CTAs (email + AI chat).
 *   2. Proof strip — SAP + peopleeat one-liners.
 *   3. Services — three pillars (digitalisation, AI workflows, web/arch).
 *   4. Why me — enterprise + startup experience side by side.
 *   5. Assistant — inline AI composer + suggested questions. Submitting (or
 *      clicking a chip) opens a Dialog with the chat surface. This is the
 *      "act now" CTA — the page is itself a demo of an AI workflow Cem builds.
 *   6. Explore — secondary nav cards (About / CV / Projects / Chat).
 *   7. Footer — contact + legal.
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
            de: 'Geschäftsprozesse digitalisieren. KI dort einsetzen, wo sie wirklich arbeitet.',
            en: 'Digitalise the work that runs your business. Put AI where it actually earns its keep.',
        },
        subhead: {
            de: 'Ich bin Cem — Software-Architekt und Full-Stack-Engineer mit Enterprise-Tiefe von SAP und Startup-Tempo als Gründungs-Architekt bei peopleeat. Ich helfe Unternehmen, manuelle Abläufe in saubere digitale Workflows zu überführen, KI sinnvoll zu integrieren — und stehe darüber hinaus für klassische Webprojekte als freiberuflicher Architekt und Entwickler zur Verfügung.',
            en: 'I’m Cem — a software architect and full-stack engineer with enterprise depth from SAP and startup speed as founding architect at peopleeat. I help companies turn manual operations into clean digital workflows, embed AI where it actually pays off — and I’m available as a freelance architect and developer for standard web projects.',
        },
        ctaPrimary: { de: 'E-Mail schreiben', en: 'Email me' },
        ctaSecondary: { de: 'KI-Assistenten fragen', en: 'Ask my AI assistant' },
    },
    proof: {
        sap: {
            label: 'SAP',
            text: {
                de: 'Mehrere Jahre Enterprise-Erfahrung — große Projekte, komplexe Integrationen, hohe Anforderungen an Qualität und Compliance.',
                en: 'Several years of enterprise experience — large projects, complex integrations, high bars for quality and compliance.',
            },
        },
        peopleEat: {
            label: 'peopleeat',
            text: {
                de: 'Gründungs-Architekt einer Food-Tech-Plattform. Von der ersten Codezeile bis zur produktiven App — Architektur, Stack-Auswahl, Delivery.',
                en: 'Founding architect of a food-tech platform. From the first commit to a live product — architecture, stack choices, delivery.',
            },
        },
    },
    services: {
        heading: { de: 'Womit ich helfe', en: 'How I help' },
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
                    de: ['Prozess-Audit & Lösungsskizze', 'Maßgeschneiderte interne Tools', 'Integration in bestehende Systeme'],
                    en: ['Process audit & solution sketch', 'Tailored internal tools', 'Integration with existing systems'],
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
                    de: ['Use-Case-Identifikation & Pilot', 'Agent- und RAG-Architekturen', 'Produktive Integration in deinen Stack'],
                    en: ['Use-case discovery & pilot', 'Agent and RAG architectures', 'Production integration into your stack'],
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
                    de: ['Greenfield-Architektur & Stack-Auswahl', 'Implementierung end-to-end', 'Technische Leitung auf Zeit'],
                    en: ['Greenfield architecture & stack choice', 'End-to-end implementation', 'Technical lead on demand'],
                },
            },
        ],
    },
    whyMe: {
        heading: { de: 'Zwei Welten — ein Engineer', en: 'Two worlds — one engineer' },
        subheading: {
            de: 'Enterprise-Disziplin trifft auf Startup-Geschwindigkeit. Ich weiß, wann ein Prozess sauberen Audit-Trail braucht — und wann „in zwei Wochen live“ wichtiger ist.',
            en: 'Enterprise discipline meets startup speed. I know when a process needs a clean audit trail — and when "live in two weeks" matters more.',
        },
        enterprise: {
            icon: Building2Icon,
            title: { de: 'Enterprise-Tiefe (SAP)', en: 'Enterprise depth (SAP)' },
            body: {
                de: 'Arbeit in großen, regulierten Umgebungen: komplexe Domänen, kritische Integrationen, langlebige Codebasen. Ich weiß, was es heißt, Software zu bauen, die fünf Jahre lang gewartet werden muss.',
                en: 'Work inside large, regulated environments: complex domains, critical integrations, long-lived codebases. I know what it takes to build software that has to be maintained for five years.',
            },
        },
        startup: {
            icon: RocketIcon,
            title: { de: 'Startup-Tempo (peopleeat)', en: 'Startup speed (peopleeat)' },
            body: {
                de: 'Gründungs-Architekt einer Food-Tech-Plattform — Architekturentscheidungen unter Unsicherheit, schnelle Iterationen, MVP zu Produkt. Ich liefere, ohne den nächsten Schritt zu verbauen.',
                en: 'Founding architect of a food-tech platform — architecture calls under uncertainty, fast iterations, MVP to product. I ship without painting the next step into a corner.',
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
                de: 'Eine Auswahl von Dingen, die ich gebaut habe.',
                en: 'A selection of things I have built.',
            },
            cta: { de: 'Projekte ansehen', en: 'View projects' },
        },
        chat: {
            title: { de: 'Frag mich was', en: 'Ask me anything' },
            description: {
                de: 'Ein KI-Assistent, der Fragen über mich und meine Arbeit beantwortet.',
                en: 'An AI assistant that answers questions about me and my work.',
            },
            cta: { de: 'Chat starten', en: 'Start chat' },
        },
    },
    assistant: {
        eyebrow: { de: 'Fragen?', en: 'Questions?' },
        heading: {
            de: 'Erst kurz fragen — dann sprechen.',
            en: 'Ask first — then talk.',
        },
        intro: {
            de: 'Mein KI-Assistent kennt meine Stationen, Projekte und Arbeitsweise — Tag und Nacht, ohne Wartezeit. Stell deine Frage in Ruhe.',
            en: 'My AI assistant knows my career, projects and how I work — day and night, no waiting. Take your time and ask.',
        },
        assistantName: { de: 'KI-Assistent von Cem', en: 'Cem’s assistant' },
        status: { de: 'jetzt verfügbar · rund um die Uhr', en: 'available now · around the clock' },
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
            de: 'Der Assistent beantwortet Fragen zu Cem und seiner Arbeit — für konkrete Angebote und Preise melde dich bitte direkt.',
            en: 'The assistant answers questions about Cem and his work — for offers and pricing, please reach out directly.',
        },
        dialog: {
            title: { de: 'Frag mich was', en: 'Ask me anything' },
            description: {
                de: 'Hier kommt bald die Chat-Oberfläche. Deine Frage ist schon bei mir.',
                en: 'The chat surface lives here soon. Your question is already with me.',
            },
            yourQuestion: { de: 'Deine Frage', en: 'Your question' },
            placeholderResponse: {
                de: 'Der KI-Assistent ist gleich an dieser Stelle verfügbar. In der Zwischenzeit erreichst du Cem direkt per E-Mail.',
                en: 'The AI assistant will live right here shortly. In the meantime you can reach Cem directly by email.',
            },
            close: { de: 'Schließen', en: 'Close' },
            emailMe: { de: 'E-Mail schreiben', en: 'Email me' },
        },
    },
    footer: {
        contactHeading: { de: 'Kontakt', en: 'Get in touch' },
        legal: {
            impressum: { de: 'Impressum', en: 'Impressum' },
            datenschutz: { de: 'Datenschutz', en: 'Privacy' },
        },
    },
};

const SOCIAL_LINKS: ReadonlyArray<{
    href: string;
    label: { de: string; en: string };
    icon: typeof CodeXmlIcon;
    visible: boolean;
}> = [
    {
        href: personalInfo.contact.github.url,
        label: { de: 'GitHub', en: 'GitHub' },
        icon: CodeXmlIcon,
        visible: personalInfo.publicVisibility.github,
    },
    {
        href: personalInfo.contact.linkedin.url,
        label: { de: 'LinkedIn', en: 'LinkedIn' },
        icon: BriefcaseIcon,
        visible: personalInfo.publicVisibility.linkedin,
    },
    {
        href: `mailto:${PRIMARY_EMAIL}`,
        label: { de: 'E-Mail', en: 'Email' },
        icon: MailIcon,
        visible: personalInfo.publicVisibility.emails && PRIMARY_EMAIL.length > 0,
    },
];

export const Route = createFileRoute('/{-$locale}/')({
    loader: () => routeLoaderGraphqlClient(HomePageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: {
                de: 'Cem Yilmaz — Beratung für Digitalisierung & KI · Freelance Software-Architekt',
                en: 'Cem Yilmaz — Digitalisation & AI consulting · Freelance software architect',
            }[locale],
            description: COPY.hero.subhead[locale],
            path: '/',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: HomePage,
});

function HomePage() {
    const locale = useLocale();

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full">
                <Hero locale={locale} />
                <ProofStrip locale={locale} />
                <Services locale={locale} />
                <WhyMe locale={locale} />
                <AssistantSection locale={locale} />
                <Explore locale={locale} />
            </main>
            <Footer locale={locale} />
        </div>
    );
}

function Hero({ locale }: { locale: Locale }) {
    const portraitAlt = {
        de: 'Porträt von Cem Yilmaz',
        en: 'Portrait of Cem Yilmaz',
    }[locale];

    return (
        <section className="py-12 md:py-20">
            <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
                <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/40 px-3 py-1 text-xs font-medium tracking-wide text-foreground/80 backdrop-blur-md dark:border-white/10 dark:bg-white/4">
                        <SparklesIcon className="size-3.5 text-primary" />
                        {COPY.hero.eyebrow[locale]}
                    </span>
                    <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight leading-tight">{COPY.hero.headline[locale]}</h1>
                    <p className="mt-6 max-w-3xl text-base md:text-lg leading-relaxed text-foreground/80">{COPY.hero.subhead[locale]}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button asChild size="lg">
                            <a href={`mailto:${PRIMARY_EMAIL}`}>
                                <MailIcon />
                                {COPY.hero.ctaPrimary[locale]}
                            </a>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link to="/{-$locale}/chat" search={{ chatId: undefined }}>
                                <BotIcon />
                                {COPY.hero.ctaSecondary[locale]}
                            </Link>
                        </Button>
                    </div>
                </div>
                <HeroPortrait alt={portraitAlt} />
            </div>
        </section>
    );
}

function HeroPortrait({ alt }: { alt: string }) {
    return (
        <div className="relative mx-auto md:mx-0">
            <div
                aria-hidden
                className="absolute -inset-3 rounded-full bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent blur-2xl"
            />
            <div className="relative size-48 overflow-hidden rounded-full border border-white/60 bg-white/40 shadow-xl backdrop-blur-md sm:size-56 md:size-64 lg:size-72 dark:border-white/10 dark:bg-white/4">
                <img src="/profile-picture.png" alt={alt} className="size-full object-cover" loading="eager" />
            </div>
        </div>
    );
}

function ProofStrip({ locale }: { locale: Locale }) {
    return (
        <section className="pb-12 md:pb-16">
            <GlassCard className="px-6 py-5">
                <div className="grid gap-5 md:grid-cols-2 md:gap-8">
                    <ProofItem label={COPY.proof.sap.label} icon={Building2Icon} text={COPY.proof.sap.text[locale]} />
                    <ProofItem label={COPY.proof.peopleEat.label} icon={RocketIcon} text={COPY.proof.peopleEat.text[locale]} />
                </div>
            </GlassCard>
        </section>
    );
}

function ProofItem({ label, icon: Icon, text }: { label: string; icon: typeof CodeXmlIcon; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                <Icon className="size-4" />
            </div>
            <div>
                <div className="text-sm font-semibold tracking-tight">{label}</div>
                <p className="mt-1 text-sm text-foreground/75 leading-relaxed">{text}</p>
            </div>
        </div>
    );
}

function Services({ locale }: { locale: Locale }) {
    return (
        <section className="pb-12 md:pb-16">
            <SectionHeading title={COPY.services.heading[locale]} subtitle={COPY.services.subheading[locale]} />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
                {COPY.services.items.map((item) => (
                    <ServiceCard
                        key={item.title.en}
                        icon={item.icon}
                        title={item.title[locale]}
                        description={item.description[locale]}
                        bullets={item.bullets[locale]}
                    />
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
            <SectionHeading title={COPY.whyMe.heading[locale]} subtitle={COPY.whyMe.subheading[locale]} />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
                <WhyMeCard
                    icon={COPY.whyMe.enterprise.icon}
                    title={COPY.whyMe.enterprise.title[locale]}
                    body={COPY.whyMe.enterprise.body[locale]}
                />
                <WhyMeCard icon={COPY.whyMe.startup.icon} title={COPY.whyMe.startup.title[locale]} body={COPY.whyMe.startup.body[locale]} />
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

function AssistantSection({ locale }: { locale: Locale }) {
    const [question, setQuestion] = useState('');
    const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);

    function open(text: string) {
        const trimmed = text.trim();
        if (trimmed.length === 0) return;
        setSubmittedQuestion(trimmed);
    }

    function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        open(question);
    }

    const canSend = question.trim().length > 0;

    return (
        <section className="pb-12 md:pb-16">
            <div className="max-w-3xl">
                <span className="text-xs font-medium tracking-[0.18em] uppercase text-foreground/60">{COPY.assistant.eyebrow[locale]}</span>
                <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">{COPY.assistant.heading[locale]}</h2>
                <p className="mt-3 text-sm md:text-base text-foreground/75 leading-relaxed">{COPY.assistant.intro[locale]}</p>
            </div>

            <div className="mt-8">
                <GlassCard className="px-5 py-5 md:px-6 md:py-6">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <SparklesIcon className="size-4" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold tracking-tight">{COPY.assistant.assistantName[locale]}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/65">
                                <span className="inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
                                {COPY.assistant.status[locale]}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="mt-4">
                        <div className="relative">
                            <Textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder={COPY.assistant.placeholder[locale]}
                                rows={3}
                                className="pr-32 resize-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        open(question);
                                    }
                                }}
                            />
                            <div className="absolute bottom-2 right-2">
                                <Button type="submit" size="sm" disabled={!canSend}>
                                    <SendHorizontalIcon />
                                    {COPY.assistant.send[locale]}
                                </Button>
                            </div>
                        </div>
                    </form>

                    <div className="mt-5">
                        <div className="text-xs font-medium tracking-[0.18em] uppercase text-foreground/60">
                            {COPY.assistant.suggestionsLabel[locale]}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {COPY.assistant.suggestions.map((s) => (
                                <button
                                    key={s.en}
                                    type="button"
                                    onClick={() => open(s[locale])}
                                    className="rounded-full border border-white/55 bg-white/40 px-3 py-1.5 text-sm text-foreground/85 transition-colors hover:bg-white/70 hover:text-foreground dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/8 cursor-pointer"
                                >
                                    {s[locale]}
                                </button>
                            ))}
                        </div>
                    </div>
                </GlassCard>

                <p className="mt-4 text-center text-xs text-foreground/55">{COPY.assistant.disclaimer[locale]}</p>
            </div>

            <AssistantDialog locale={locale} question={submittedQuestion} onClose={() => setSubmittedQuestion(null)} />
        </section>
    );
}

function AssistantDialog({ locale, question, onClose }: { locale: Locale; question: string | null; onClose: () => void }) {
    const isOpen = question !== null;

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
        >
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary">
                        <SparklesIcon className="size-4" />
                        <DialogTitle>{COPY.assistant.dialog.title[locale]}</DialogTitle>
                    </div>
                    <DialogDescription>{COPY.assistant.dialog.description[locale]}</DialogDescription>
                </DialogHeader>

                {question && (
                    <div className="rounded-md border bg-muted/40 p-3">
                        <div className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground">
                            {COPY.assistant.dialog.yourQuestion[locale]}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed">{question}</p>
                    </div>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed">{COPY.assistant.dialog.placeholderResponse[locale]}</p>

                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onClose}>
                        {COPY.assistant.dialog.close[locale]}
                    </Button>
                    <Button asChild>
                        <a href={`mailto:${PRIMARY_EMAIL}`}>
                            <MailIcon />
                            {COPY.assistant.dialog.emailMe[locale]}
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Explore({ locale }: { locale: Locale }) {
    return (
        <section className="pb-16">
            <SectionHeading title={COPY.explore.heading[locale]} subtitle={COPY.explore.subheading[locale]} />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
                <NavCard
                    to="/{-$locale}/about"
                    icon={UserRoundIcon}
                    title={COPY.explore.about.title[locale]}
                    description={COPY.explore.about.description[locale]}
                    cta={COPY.explore.about.cta[locale]}
                />
                <NavCard
                    to="/{-$locale}/cv"
                    icon={FileTextIcon}
                    title={COPY.explore.cv.title[locale]}
                    description={COPY.explore.cv.description[locale]}
                    cta={COPY.explore.cv.cta[locale]}
                />
                <NavCard
                    to="/{-$locale}/projects"
                    icon={FolderGitIcon}
                    title={COPY.explore.projects.title[locale]}
                    description={COPY.explore.projects.description[locale]}
                    cta={COPY.explore.projects.cta[locale]}
                />
                <ChatCard locale={locale} />
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
            <GlassCard className="h-full py-6 transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                        <Icon className="size-5" />
                        <CardTitle className="text-xl">{title}</CardTitle>
                    </div>
                    <CardDescription>{description}</CardDescription>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                        {cta}
                        <ArrowRightIcon className="size-4" />
                    </span>
                </CardContent>
            </GlassCard>
        </Link>
    );
}

function ChatCard({ locale }: { locale: Locale }) {
    return (
        <Link to="/{-$locale}/chat" search={{ chatId: undefined }} className="group">
            <GlassCard className="h-full py-6 transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary">
                        <MessageSquareIcon className="size-5" />
                        <CardTitle className="text-xl">{COPY.explore.chat.title[locale]}</CardTitle>
                    </div>
                    <CardDescription>{COPY.explore.chat.description[locale]}</CardDescription>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                        {COPY.explore.chat.cta[locale]}
                        <ArrowRightIcon className="size-4" />
                    </span>
                </CardContent>
            </GlassCard>
        </Link>
    );
}

function Footer({ locale }: { locale: Locale }) {
    return (
        <footer className="border-t mt-12">
            <div className="px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground">{COPY.footer.contactHeading[locale]}</h2>
                    <ul className="mt-3 flex gap-4">
                        {SOCIAL_LINKS.filter((link) => link.visible).map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm hover:text-primary"
                                >
                                    <Icon className="size-4" />
                                    {label[locale]}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                <nav className="flex gap-4 text-sm text-muted-foreground">
                    <Link to="/{-$locale}/impressum" className="hover:text-foreground">
                        {COPY.footer.legal.impressum[locale]}
                    </Link>
                    <Link to="/{-$locale}/datenschutz" className="hover:text-foreground">
                        {COPY.footer.legal.datenschutz[locale]}
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
