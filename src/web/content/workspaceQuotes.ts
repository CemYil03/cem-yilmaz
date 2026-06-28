// Motivational quotes shown on `/workspace` in place of the older
// "Welcome back, Cem" greeting. The hub is Cem's own landing — a
// generic welcome was wallpaper; a rotating line of motivation is
// the actual reason to look at the top of the page.
//
// Selection is deterministic per UTC day (see `workspaceQuotePick`),
// not random per render, so:
//   - SSR and hydration agree without a `useEffect` flash on first paint.
//   - In-app navigations back to `/workspace` show the same line all day,
//     not a new one every time — the headline is not the point of the
//     page and shouldn't churn under Cem while he works.
//
// New quotes go here as a `{ de, en, attribution? }` triple. Edited via
// PR — same pattern as `personalInfo.ts` and `portfolioProjects.ts`.
// `attribution` is omitted for Cem's own lines and included for the
// well-known ones so the visual treatment can render an em-dashed
// byline beneath them.

interface WorkspaceQuote {
    de: string;
    en: string;
    // Author name only — no honorifics, no "said in <book>". The card
    // formats this as `— ${attribution}` below the line.
    attribution?: string;
}

// Module-local so the list can only be consumed via `workspaceQuotePick()`
// — keeps the rotation logic in one place and lets `knip` see the array as
// reached. New entries are PR-edited inline; nobody outside this file needs
// to map or iterate the raw list.
const workspaceQuotes: ReadonlyArray<WorkspaceQuote> = [
    // Cem's own.
    {
        de: 'Ich würde keine Summe der Welt dafür eintauschen, morgen nicht wieder aufzuwachen.',
        en: 'I would not trade any sum in the world for not waking up tomorrow.',
    },
    // Freddie Laker to Richard Branson, recounted in "Losing My Virginity".
    // Cem quoted it in DE shorthand; the canonical English line follows.
    {
        de: 'Man braucht nur ein Telefon und keinen Cent, um eine Airline zu gründen.',
        en: 'All you need to start an airline is a telephone — not a penny in the bank.',
        attribution: 'Sir Freddie Laker',
    },
    {
        de: 'Scheiß drauf, machen wir’s einfach.',
        en: "Screw it, let's do it.",
        attribution: 'Richard Branson',
    },
    {
        de: 'Wenn dich die erste Version deines Produkts nicht peinlich berührt, hast du zu spät veröffentlicht.',
        en: "If you're not embarrassed by the first version of your product, you've launched too late.",
        attribution: 'Reid Hoffman',
    },
    {
        de: 'Fertig ist besser als perfekt.',
        en: 'Done is better than perfect.',
        attribution: 'Sheryl Sandberg',
    },
    {
        de: 'Bleib hungrig. Bleib töricht.',
        en: 'Stay hungry. Stay foolish.',
        attribution: 'Steve Jobs',
    },
    {
        de: 'Siebenmal hinfallen, achtmal aufstehen.',
        en: 'Fall down seven times, get up eight.',
        attribution: '七転び八起き',
    },
    {
        de: 'Der einzige Ausweg führt mittendurch.',
        en: 'The only way out is through.',
        attribution: 'Robert Frost',
    },
];

// Deterministic per-day index. UTC so server and client agree even
// across the German/UTC offset; the rotation rolls at 02:00 Berlin
// summer time / 01:00 winter — fine, nobody's measuring this.
//
// Exported so a future test can pin a date and assert the chosen quote.
export function workspaceQuotePick(now: Date = new Date()): WorkspaceQuote {
    const startOfYearUtc = Date.UTC(now.getUTCFullYear(), 0, 0);
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dayOfYear = Math.floor((todayUtc - startOfYearUtc) / 86_400_000);
    const index = ((dayOfYear % workspaceQuotes.length) + workspaceQuotes.length) % workspaceQuotes.length;
    return workspaceQuotes[index]!;
}
