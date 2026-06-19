import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRightIcon, BriefcaseIcon, CodeXmlIcon, MailIcon } from 'lucide-react';
import { CvSkillGroup } from '../../web/components/CvSkillGroup';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { personalInfo } from '../../web/content/personalInfo';
import { AboutPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import type { Locale } from '../../web/utils/locale';
import { localeFromParam } from '../../web/utils/locale';

const COPY = {
    title: { de: 'Über mich', en: 'About me' },
    intro: {
        de: 'Wer ich bin, woran ich arbeite, und wie du mich erreichst.',
        en: 'Who I am, what I work on, and how to reach me.',
    },
    sections: {
        identity: { de: 'Profil', en: 'Profile' },
        skills: { de: 'Skills & Werkzeuge', en: 'Skills & tools' },
        hobbies: { de: 'Freizeit', en: 'Hobbies' },
        contact: { de: 'Kontakt', en: 'Contact' },
    },
    facts: {
        born: { de: 'Geboren', en: 'Born' },
        residence: { de: 'Wohnort', en: 'Based in' },
        nationality: { de: 'Staatsangehörigkeit', en: 'Nationality' },
        languages: { de: 'Sprachen', en: 'Languages' },
    },
    cta: {
        cv: { de: 'Vollständigen Lebenslauf ansehen', en: 'View the full CV' },
    },
};

const GERMAN_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const ENGLISH_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

export const Route = createFileRoute('/{-$locale}/about')({
    loader: () => routeLoaderGraphqlClient(AboutPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.intro[locale],
            path: '/about',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: AboutPage,
});

function AboutPage() {
    const locale = useLocale();
    const data = Route.useLoaderData();

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-4xl mx-auto w-full pb-16">
                <header className="py-12 md:py-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{COPY.title[locale]}</h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                        {personalInfo.tagline[locale]} {personalInfo.subtitle[locale]}
                    </p>
                    <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed">{personalInfo.bio[locale]}</p>
                </header>

                <IdentityFacts locale={locale} />

                <section className="mt-12">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">{COPY.sections.skills[locale]}</h2>
                    <CvSkillGroup skills={data.cv.skills} locale={locale} />
                </section>

                <section className="mt-12">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">{COPY.sections.hobbies[locale]}</h2>
                    <GlassCard className="px-6 py-5">
                        <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                            {data.cv.hobbies.map((hobby) => {
                                const text = locale === 'de' ? hobby.textDe : hobby.textEn;
                                const sincePrefix = hobby.since ? `${locale === 'de' ? 'Seit' : 'Since'} ${hobby.since}: ` : '';
                                return <li key={hobby.cvHobbyId}>{sincePrefix + text}</li>;
                            })}
                        </ul>
                    </GlassCard>
                </section>

                <ContactBlock locale={locale} />

                <section className="mt-12">
                    <Link
                        to="/{-$locale}/cv"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {COPY.cta.cv[locale]}
                        <ArrowRightIcon className="size-4" />
                    </Link>
                </section>
            </main>
        </div>
    );
}

function IdentityFacts({ locale }: { locale: Locale }) {
    const formatter = locale === 'de' ? GERMAN_DATE_FORMATTER : ENGLISH_DATE_FORMATTER;
    const born = `${formatter.format(new Date(personalInfo.dateOfBirth))} — ${personalInfo.placeOfBirth}`;
    const residence = `${personalInfo.residence.postalCode} ${personalInfo.residence.city}`;
    const languages = personalInfo.spokenLanguages.map((l) => l[locale]).join(', ');
    return (
        <section className="mt-4">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">{COPY.sections.identity[locale]}</h2>
            <GlassCard className="px-6 py-5">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    <Fact label={COPY.facts.born[locale]} value={born} />
                    <Fact label={COPY.facts.residence[locale]} value={residence} />
                    <Fact label={COPY.facts.nationality[locale]} value={personalInfo.nationality[locale]} />
                    <Fact label={COPY.facts.languages[locale]} value={languages} />
                </dl>
            </GlassCard>
        </section>
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
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">{COPY.sections.contact[locale]}</h2>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {items.map(({ key, icon: Icon, label, href, body }) => (
                    <li key={key}>
                        <a
                            href={href}
                            target={href.startsWith('mailto:') ? undefined : '_blank'}
                            rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
                            className="block"
                        >
                            <GlassCard className="px-5 py-4 transition-colors hover:bg-white/55 dark:hover:bg-white/8">
                                <div className="flex items-center gap-2 text-sm">
                                    <Icon className="size-4 text-primary" />
                                    <span className="font-medium">{label}</span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{body}</p>
                            </GlassCard>
                        </a>
                    </li>
                ))}
            </ul>
        </section>
    );
}
