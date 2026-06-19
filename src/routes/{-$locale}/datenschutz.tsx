import { createFileRoute, Link } from '@tanstack/react-router';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

// TODO(launch): adjust this notice as soon as the real data-processing
// surface is locked in (workspace OAuth scopes, contact form, analytics, …).
// Until then this is a baseline GDPR notice covering only what the site
// actually does today: cookie-based session, the visitor AI chat that calls
// Google Gemini, and standard server logs.

export const Route = createFileRoute('/{-$locale}/datenschutz')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Datenschutz', en: 'Privacy' }[locale],
            description: {
                de: 'Hinweise zur Verarbeitung personenbezogener Daten auf cem-yilmaz.de.',
                en: 'How personal data is handled on cem-yilmaz.de.',
            }[locale],
            path: '/datenschutz',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: DatenschutzPage,
});

function DatenschutzPage() {
    const locale = useLocale();
    return locale === 'de' ? <PageDe /> : <PageEn />;
}

function PageDe() {
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}" className="text-sm text-muted-foreground hover:text-foreground">
                ← Zur Startseite
            </Link>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Datenschutz</h1>

            <h2 className="mt-8 text-lg font-semibold">Verantwortlicher</h2>
            <p className="mt-2">
                Verantwortlich für die Datenverarbeitung auf cem-yilmaz.de ist Cem Yilmaz. Die vollständigen Kontaktdaten finden sich im{' '}
                <Link to="/{-$locale}/impressum" className="underline">
                    Impressum
                </Link>
                .
            </p>

            <h2 className="mt-6 text-lg font-semibold">Sitzungs-Cookie</h2>
            <p className="mt-2">
                Beim ersten Aufruf wird ein technisch notwendiges Cookie gesetzt, das eine zufällige Sitzungs-ID enthält. Es wird benötigt,
                damit der KI-Chat zwischen einzelnen Anfragen den Gesprächskontext halten kann. Es enthält keine personenbezogenen Daten und
                wird nicht für Tracking oder Werbung verwendet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
                Betrieb der Seite).
            </p>

            <h2 className="mt-6 text-lg font-semibold">KI-Chat (&bdquo;Frag mich was&ldquo;)</h2>
            <p className="mt-2">
                Wer den Chat auf dieser Seite nutzt, sendet seine Eingaben an die Google Generative Language API (Google Ireland Limited),
                damit das Modell eine Antwort erzeugen kann. Eingaben und Antworten werden zusätzlich in der Datenbank dieser Seite
                gespeichert, um den Gesprächsverlauf darzustellen. Bitte keine personenbezogenen oder vertraulichen Daten in den Chat
                eingeben.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Server-Logs</h2>
            <p className="mt-2">
                Beim Aufruf der Seite werden die üblichen technischen Daten verarbeitet (IP-Adresse, User-Agent, Zeitpunkt, abgerufene
                Ressource), um den Betrieb sicherzustellen und Fehler zu diagnostizieren.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Anmeldung am Workspace (geplant)</h2>
            <p className="mt-2">
                Der private <code>/workspace</code>-Bereich nutzt eine GitHub-OAuth-Anmeldung. Dabei werden GitHub-Benutzername und
                GitHub-ID gespeichert. Dieser Bereich ist ausschließlich dem Betreiber selbst zugänglich.
            </p>

            <p className="mt-8 text-sm text-muted-foreground">
                Hinweis: Diese Erklärung wird vor dem Live-Gang auf den tatsächlichen Stand erweitert.
            </p>
        </main>
    );
}

function PageEn() {
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to home
            </Link>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy</h1>

            <h2 className="mt-8 text-lg font-semibold">Controller</h2>
            <p className="mt-2">
                The controller for data processing on cem-yilmaz.de is Cem Yilmaz. Full contact details are in the{' '}
                <Link to="/{-$locale}/impressum" className="underline">
                    Imprint
                </Link>
                .
            </p>

            <h2 className="mt-6 text-lg font-semibold">Session cookie</h2>
            <p className="mt-2">
                On first visit, a technically necessary cookie is set containing a random session id. The chat needs it to keep the
                conversation context across requests. It contains no personal data and is not used for tracking or advertising. Legal basis:
                Art. 6(1)(f) GDPR (legitimate interest in operating the site).
            </p>

            <h2 className="mt-6 text-lg font-semibold">AI chat (&ldquo;Ask me anything&rdquo;)</h2>
            <p className="mt-2">
                Using the chat on this site sends your input to the Google Generative Language API (Google Ireland Limited) so the model can
                produce a response. Inputs and replies are also stored in this site&rsquo;s database to display the conversation. Please do
                not enter personal or confidential data into the chat.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Server logs</h2>
            <p className="mt-2">
                When you visit the site, standard technical data is processed (IP address, user agent, timestamp, requested resource) to
                operate the site and diagnose errors.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Workspace sign-in (planned)</h2>
            <p className="mt-2">
                The private <code>/workspace</code> area uses GitHub OAuth. GitHub username and GitHub user id are stored. This area is only
                accessible to the operator.
            </p>

            <p className="mt-8 text-sm text-muted-foreground">
                Note: this notice will be expanded to match actual data processing before launch.
            </p>
        </main>
    );
}
