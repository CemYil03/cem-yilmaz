import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRightIcon, BriefcaseIcon, CodeXmlIcon, MailIcon } from 'lucide-react';
import { Button } from '../../web/components/base/button';
import { CvSkillGroup } from '../../web/components/CvSkillGroup';
import { Footer } from '../../web/components/Footer';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { Reveal } from '../../web/components/Reveal';
import { personalInfo } from '../../web/content/personalInfo';
import { AboutPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';
import { jsonLdFaqPage, jsonLdProfilePage } from '../../web/seo/jsonLd';
import type { FaqEntry } from '../../web/seo/jsonLd';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import type { Locale } from '../../web/utils/locale';
import { localeFromParam } from '../../web/utils/locale';

const title = { de: 'Über mich', en: 'About me' };

// Q&A block rendered on /about and mirrored into the page's FAQPage JSON-LD.
// Crawler-friendly answers: discrete, factual, ~1-3 sentences each. AI
// engines (Perplexity, ChatGPT Search, Google AI Overviews) extract these
// verbatim when answering "who is Cem Yilmaz", "where does Cem live", etc.
// Keep answers in sync with `personalInfo` and the public CV — drift here
// becomes contradictions in AI answers.
function buildFaq(locale: Locale): ReadonlyArray<FaqEntry> {
    const city = personalInfo.residence.city;
    const github = personalInfo.contact.github.url;
    const linkedin = personalInfo.contact.linkedin.url;
    const email = personalInfo.contact.emails[0] ?? '';
    if (locale === 'de') {
        return [
            {
                question: 'Wer ist Cem Yilmaz?',
                answer: `Cem Yilmaz ist Full-Stack- und AI-Engineer mit Erfahrung in großen SAP-Projekten und in Startups. Er baut Produkte von der Datenbank bis zum Pixel und arbeitet freiberuflich an Digitalisierungs-, KI- und Web-Architektur-Projekten.`,
            },
            {
                question: 'Wo lebt Cem?',
                answer: `Cem lebt in ${city} in Rheinland-Pfalz, Deutschland. Mandate werden in der Regel remote durchgeführt; vor Ort im Großraum Mannheim/Ludwigshafen/Karlsruhe nach Absprache.`,
            },
            {
                question: 'Funktioniert das mit Teams in Nordamerika oder Indien trotz der Zeitverschiebung?',
                answer: 'Ja. Cem arbeitet regelmäßig mit verteilten Teams in Kanada, den USA und Indien zusammen. Frühe Calls vor dem Frühstück (ab ca. 7 Uhr deutscher Zeit für Indien) und späte Calls am Abend (bis ca. 22 Uhr deutscher Zeit für Nordamerika) sind Teil des Pakets, nicht die Ausnahme.',
            },
            {
                question: 'Womit arbeitet Cem hauptsächlich?',
                answer: 'Schwerpunkte sind Digitalisierung manueller Prozesse, KI-Workflows (Vercel AI SDK, Google Gemini, Claude), TypeScript/React/Node-Stacks und SAP-Integrationen. Voller Stack inklusive Datenbankdesign und Deployment.',
            },
            {
                question: 'Kann ich Cem für ein Projekt buchen?',
                answer: `Ja — Cem nimmt selektiv Freelance-Mandate an. Schreibe an ${email} oder starte den KI-Assistenten auf der Startseite, um ein Projekt zu beschreiben und Verfügbarkeit zu prüfen.`,
            },
            {
                question: 'Wie kontaktiere ich Cem?',
                answer: `Per E-Mail an ${email}, über GitHub (${github}) oder LinkedIn (${linkedin}). Auf der Startseite steht zusätzlich ein KI-Assistent rund um die Uhr für Fragen zur Verfügung.`,
            },
        ];
    }
    return [
        {
            question: 'Who is Cem Yilmaz?',
            answer: `Cem Yilmaz is a full-stack and AI engineer with experience across large SAP projects and startups. He builds products from the database to the pixel and takes on freelance work in digitalisation, AI workflows, and web architecture.`,
        },
        {
            question: 'Where is Cem based?',
            answer: `Cem lives in ${city}, Rhineland-Palatinate, Germany. Engagements are usually remote; on-site in the Mannheim / Ludwigshafen / Karlsruhe area by arrangement.`,
        },
        {
            question: 'Does working with teams in North America or India still work despite the time difference?',
            answer: 'Yes. Cem regularly works with distributed teams in Canada, the US and India. Early calls before breakfast (from around 7am German time for India) and late calls after dinner (until around 10pm German time for North America) are part of the package, not the exception.',
        },
        {
            question: 'What does Cem work on?',
            answer: 'Digitalisation of manual operations, AI workflows (Vercel AI SDK, Google Gemini, Claude), TypeScript / React / Node stacks, and SAP integrations. Full stack including database design and deployment.',
        },
        {
            question: 'Can I hire Cem for a project?',
            answer: `Yes — Cem takes on selective freelance engagements. Reach out at ${email} or start the AI assistant on the home page to describe a project and check availability.`,
        },
        {
            question: 'How do I contact Cem?',
            answer: `Email ${email}, GitHub (${github}), or LinkedIn (${linkedin}). The home page also hosts an AI assistant available around the clock for live questions.`,
        },
    ];
}

const GERMAN_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const ENGLISH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

export const Route = createFileRoute('/{-$locale}/about')({
    loader: () => routeLoaderGraphqlClient(AboutPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        const webPageUrl = webPageUrlGet();
        const seo = seoMeta({
            title: title[locale],
            description: {
                de: 'Wer ich bin, woran ich arbeite, und wie du mich erreichst.',
                en: 'Who I am, what I work on, and how to reach me.',
            }[locale],
            path: '/about',
            locale,
            webPageUrl,
        });
        // ProfilePage + FAQPage JSON-LD. The Profile schema tells AI engines
        // this is the canonical "about" page for the Person on the homepage;
        // the FAQ schema mirrors the visible Q&A block below so engines can
        // extract discrete answers verbatim. The visible block is the
        // source of truth — keep `buildFaq()` in sync with what renders.
        const profile = jsonLdProfilePage(webPageUrl, locale);
        const faq = jsonLdFaqPage(buildFaq(locale));
        return {
            ...seo,
            scripts: [
                { type: profile.type, children: profile.children },
                { type: faq.type, children: faq.children },
            ],
        };
    },
    component: AboutPage,
});

function AboutPage() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    // Admin-only "Workspace" entry in the header — non-admins (including
    // anonymous visitors) get `user.admin = null` and never see it. Same
    // probe as the landing page. See `docs/architecture/workspace-access.md`.
    const isAdmin = data.sessionFindOne.user?.admin != null;

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header subtitle={`/ ${title[locale].toLowerCase()}`} showWorkspaceLink={isAdmin} />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-16">
                <header className="py-12 md:py-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{title[locale]}</h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                        {personalInfo.tagline[locale]} {personalInfo.subtitle[locale]}
                    </p>
                    <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed">{personalInfo.bio[locale]}</p>
                </header>

                <Reveal as="section" className="mt-4">
                    <IdentityFacts locale={locale} />
                </Reveal>

                <Reveal as="section" className="mt-12">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">
                        {{ de: 'Skills & Werkzeuge', en: 'Skills & tools' }[locale]}
                    </h2>
                    <CvSkillGroup skills={data.publicCvFindOne.publicCvSkillFindMany} locale={locale} />
                </Reveal>

                <Reveal as="section" className="mt-12">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">{{ de: 'Freizeit', en: 'Hobbies' }[locale]}</h2>
                    <GlassCard className="px-6 py-5">
                        <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                            {data.publicCvFindOne.publicCvHobbyFindMany.map((hobby) => {
                                const text = locale === 'de' ? hobby.textDe : hobby.textEn;
                                const sincePrefix = hobby.since ? `${locale === 'de' ? 'Seit' : 'Since'} ${hobby.since}: ` : '';
                                return <li key={hobby.cvHobbyId}>{sincePrefix + text}</li>;
                            })}
                        </ul>
                    </GlassCard>
                </Reveal>

                <ContactBlock locale={locale} />

                <FaqBlock locale={locale} />

                <Reveal as="section" className="mt-12">
                    <Button asChild size="lg">
                        <Link to="/{-$locale}/cv" className="group">
                            {{ de: 'Vollständigen Lebenslauf ansehen', en: 'View the full CV' }[locale]}
                            <ArrowRightIcon className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                        </Link>
                    </Button>
                </Reveal>
            </main>
            <Footer />
        </div>
    );
}

function IdentityFacts({ locale }: { locale: Locale }) {
    const formatter = locale === 'de' ? GERMAN_DATE_FORMATTER : ENGLISH_DATE_FORMATTER;
    const born = `${formatter.format(new Date(personalInfo.dateOfBirth))} — ${personalInfo.placeOfBirth}`;
    const residence = `${personalInfo.residence.postalCode} ${personalInfo.residence.city}`;
    const languages = personalInfo.spokenLanguages.map((l) => l[locale]).join(', ');
    return (
        <>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">{{ de: 'Profil', en: 'Profile' }[locale]}</h2>
            <GlassCard className="px-6 py-5">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    <Fact label={{ de: 'Geboren', en: 'Born' }[locale]} value={born} />
                    <Fact label={{ de: 'Wohnort', en: 'Based in' }[locale]} value={residence} />
                    <Fact label={{ de: 'Staatsangehörigkeit', en: 'Nationality' }[locale]} value={personalInfo.nationality[locale]} />
                    <Fact label={{ de: 'Sprachen', en: 'Languages' }[locale]} value={languages} />
                </dl>
            </GlassCard>
        </>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm">{value}</dd>
        </div>
    );
}

function ContactBlock({ locale }: { locale: Locale }) {
    const v = personalInfo.publicVisibility;
    const items: Array<{ key: string; icon: typeof MailIcon; label: string; href: string; body: string }> = [];
    if (v.emails && personalInfo.contact.emails[0]) {
        const email = personalInfo.contact.emails[0];
        items.push({ key: 'email', icon: MailIcon, label: 'Email', href: `mailto:${email}`, body: email });
    }
    if (v.github) {
        items.push({
            key: 'github',
            icon: CodeXmlIcon,
            label: 'GitHub',
            href: personalInfo.contact.github.url,
            body: personalInfo.contact.github.handle,
        });
    }
    if (v.linkedin) {
        items.push({
            key: 'linkedin',
            icon: BriefcaseIcon,
            label: 'LinkedIn',
            href: personalInfo.contact.linkedin.url,
            body: personalInfo.contact.linkedin.handle,
        });
    }
    return (
        <section className="mt-12">
            <Reveal>
                <h2 className="mb-4 text-2xl font-semibold tracking-tight">{{ de: 'Kontakt', en: 'Contact' }[locale]}</h2>
            </Reveal>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {items.map(({ key, icon: Icon, label, href, body }, i) => (
                    <Reveal as="li" key={key} index={i} className="h-full">
                        <a
                            href={href}
                            target={href.startsWith('mailto:') ? undefined : '_blank'}
                            rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
                            className="block"
                        >
                            <GlassCard className="px-5 py-4 transition-colors hover:bg-white/55 dark:hover:bg-white/8 active:bg-white/70 dark:active:bg-white/12">
                                <div className="flex items-center gap-2 text-sm">
                                    <Icon className="size-4 text-primary" />
                                    <span className="font-medium">{label}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{body}</p>
                            </GlassCard>
                        </a>
                    </Reveal>
                ))}
            </ul>
        </section>
    );
}

// Visible counterpart of the FAQPage JSON-LD. Renders as `<details>` so the
// answers are crawlable in the DOM (open or closed) but stay tidy for human
// readers. Keep the visible answers verbatim with `buildFaq()` so search
// engines do not penalise the schema for mismatched content.
function FaqBlock({ locale }: { locale: Locale }) {
    const entries = buildFaq(locale);
    return (
        <section className="mt-12">
            <Reveal>
                <h2 className="mb-4 text-2xl font-semibold tracking-tight">{{ de: 'Häufige Fragen', en: 'Common questions' }[locale]}</h2>
            </Reveal>
            <ul className="flex flex-col gap-2">
                {entries.map((entry, i) => (
                    <Reveal as="li" key={entry.question} index={i}>
                        <GlassCard className="px-5 py-3">
                            <details className="group">
                                <summary className="cursor-pointer list-none font-medium text-sm md:text-base flex items-center justify-between gap-3">
                                    <span>{entry.question}</span>
                                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-90 motion-reduce:transition-none" />
                                </summary>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
                            </details>
                        </GlassCard>
                    </Reveal>
                ))}
            </ul>
        </section>
    );
}
