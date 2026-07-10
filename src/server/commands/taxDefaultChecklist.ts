import type { AdminTaxDocumentKind } from '../db/schema';

// The document checklist seeded into every newly-created tax year. Tuned for
// Cem's situation — employee (Anlage N) + self-employed (Anlage S / EÜR) +
// minijob, plus the Vorsorgeaufwendungen statement everyone needs. The `title`
// is bilingual-ish plain text (the checklist is admin-only, DE-first); the
// page renders `kind` via `DOCUMENT_KIND_LABELS` for the localized chip.
//
// Referenced by `adminTaxYearsUpsert` (seed on insert) and
// `taxSnapshotForAgent` (so the sub-agent knows the standard checklist).
export const TAX_DEFAULT_CHECKLIST: ReadonlyArray<{ kind: AdminTaxDocumentKind; title: string }> = [
    { kind: 'lohnsteuerbescheinigung', title: 'Lohnsteuerbescheinigung (Anlage N)' },
    { kind: 'euer', title: 'Einnahmenüberschussrechnung (Anlage S / EÜR)' },
    { kind: 'minijobConfirmation', title: 'Minijob-Nachweis' },
    { kind: 'insuranceStatement', title: 'Vorsorgeaufwendungen (Versicherungen)' },
];
