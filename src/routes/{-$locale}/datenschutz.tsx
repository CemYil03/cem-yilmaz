import { createFileRoute, Link } from '@tanstack/react-router';
import { Header } from '../../web/components/Header';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

// GDPR notice covering what the site actually does today: a cookie-based
// session, the visitor AI chat that calls Google Gemini (with optional file
// attachments), and standard server logs at IONOS. Extend this page whenever
// the data-processing surface grows — for example when analytics, a contact
// form, or a third-party embed lands.

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
    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
                {locale === 'de' ? <PageDe /> : <PageEn />}
            </main>
        </div>
    );
}

function PageDe() {
    return (
        <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Datenschutz</h1>

            <h2 className="mt-8 text-lg font-semibold">Verantwortlicher</h2>
            <p className="mt-2">
                Verantwortlich für die Datenverarbeitung auf cem-yilmaz.de ist Cem Yilmaz. Die vollständigen Kontaktdaten finden sich im{' '}
                <Link to="/{-$locale}/impressum" className="underline">
                    Impressum
                </Link>
                .
            </p>

            <h2 className="mt-6 text-lg font-semibold">Hosting</h2>
            <p className="mt-2">
                Die Seite wird bei der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Deutschland gehostet. Mit IONOS besteht ein
                Auftragsverarbeitungsvertrag nach Art. 28 DSGVO. Sämtliche Daten (Datenbank, Datei-Anhänge, Server-Logs) werden auf Servern
                in Deutschland verarbeitet.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Sitzungs-Cookie</h2>
            <p className="mt-2">
                Beim ersten Aufruf wird ein technisch notwendiges Cookie gesetzt, das eine zufällige Sitzungs-ID enthält. Es wird benötigt,
                damit der KI-Chat zwischen einzelnen Anfragen den Gesprächskontext halten kann. Es enthält keine personenbezogenen Daten und
                wird nicht für Tracking oder Werbung verwendet. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
                Betrieb der Seite). Speicherdauer: 12 Monate ab dem letzten Aufruf.
            </p>

            <h2 className="mt-6 text-lg font-semibold">KI-Chat (&bdquo;Frag mich was&ldquo;)</h2>
            <p className="mt-2">
                Wer den Chat auf dieser Seite nutzt, sendet seine Eingaben an die Google Ireland Limited (Gordon House, Barrow Street,
                Dublin 4, Irland) als Anbieter der Generative Language API, damit das Modell eine Antwort erzeugen kann. Google verarbeitet
                Daten auch in den USA; die Übermittlung erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).
                Eingaben und Antworten werden zusätzlich in der Datenbank dieser Seite gespeichert, um den Gesprächsverlauf darzustellen.
                Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Speicherdauer: bis zur Löschung des zugehörigen Sitzungs-Cookies bzw.
                spätestens nach 12 Monaten ohne Aktivität. Bitte keine personenbezogenen oder vertraulichen Daten in den Chat eingeben.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Datei-Anhänge im Chat</h2>
            <p className="mt-2">
                Optional können dem Chat Dateien angehängt werden (z. B. Bilder oder PDFs). Die Dateien werden in der Datenbank dieser Seite
                gespeichert und für die Antwortgenerierung an die Google Generative Language API übermittelt. Die Speicherdauer entspricht
                derjenigen des Chats; mit Löschung der Sitzung werden auch die zugehörigen Anhänge entfernt. Rechtsgrundlage: Art. 6 Abs. 1
                lit. f DSGVO.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Server-Logs</h2>
            <p className="mt-2">
                Beim Aufruf der Seite werden die üblichen technischen Daten verarbeitet (IP-Adresse, User-Agent, Zeitpunkt, abgerufene
                Ressource), um den Betrieb sicherzustellen und Fehler zu diagnostizieren. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.
                Speicherdauer: maximal 14 Tage.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Ihre Rechte</h2>
            <p className="mt-2">
                Sie haben jederzeit das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
                Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie ein Widerspruchsrecht gegen Verarbeitungen auf Grundlage
                berechtigter Interessen (Art. 21 DSGVO). Anfragen richten Sie bitte an die im Impressum genannten Kontaktdaten.
            </p>
            <p className="mt-2">
                Daneben besteht ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde. Zuständig ist der Landesbeauftragte für den
                Datenschutz und die Informationsfreiheit Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz.
            </p>
        </>
    );
}

function PageEn() {
    return (
        <>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy</h1>

            <h2 className="mt-8 text-lg font-semibold">Controller</h2>
            <p className="mt-2">
                The controller for data processing on cem-yilmaz.de is Cem Yilmaz. Full contact details are in the{' '}
                <Link to="/{-$locale}/impressum" className="underline">
                    Imprint
                </Link>
                .
            </p>

            <h2 className="mt-6 text-lg font-semibold">Hosting</h2>
            <p className="mt-2">
                The site is hosted by IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Germany. A data-processing agreement under Art. 28
                GDPR is in place with IONOS. All data (database, file attachments, server logs) is processed on servers located in Germany.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Session cookie</h2>
            <p className="mt-2">
                On first visit, a technically necessary cookie is set containing a random session id. The chat needs it to keep the
                conversation context across requests. It contains no personal data and is not used for tracking or advertising. Legal basis:
                Art. 6(1)(f) GDPR (legitimate interest in operating the site). Retention: 12 months from the last visit.
            </p>

            <h2 className="mt-6 text-lg font-semibold">AI chat (&ldquo;Ask me anything&rdquo;)</h2>
            <p className="mt-2">
                Using the chat on this site sends your input to Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Ireland) as
                the provider of the Generative Language API so the model can produce a response. Google also processes data in the United
                States; the transfer relies on the EU Standard Contractual Clauses (Art. 46(2)(c) GDPR). Inputs and replies are also stored
                in this site&rsquo;s database to display the conversation. Legal basis: Art. 6(1)(f) GDPR. Retention: until the
                corresponding session cookie is deleted, at the latest after 12 months of inactivity. Please do not enter personal or
                confidential data into the chat.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Chat file attachments</h2>
            <p className="mt-2">
                You may optionally attach files (e.g. images or PDFs) to the chat. Attachments are stored in this site&rsquo;s database and
                forwarded to the Google Generative Language API to generate the response. Retention follows the chat itself; deleting the
                session also removes the associated attachments. Legal basis: Art. 6(1)(f) GDPR.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Server logs</h2>
            <p className="mt-2">
                When you visit the site, standard technical data is processed (IP address, user agent, timestamp, requested resource) to
                operate the site and diagnose errors. Legal basis: Art. 6(1)(f) GDPR. Retention: at most 14 days.
            </p>

            <h2 className="mt-6 text-lg font-semibold">Your rights</h2>
            <p className="mt-2">
                You have the right to access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18) and
                data portability (Art. 20), as well as the right to object to processing based on legitimate interests (Art. 21 GDPR). To
                exercise any of these, use the contact details in the Imprint.
            </p>
            <p className="mt-2">
                You also have the right to lodge a complaint with a data-protection supervisory authority. The competent authority is the
                Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz,
                Germany.
            </p>
        </>
    );
}
