import type { MedicalCategory } from '../db/schema';

// Default cadence (months) between completed visits for each category.
// `null` means "no recurring cadence — book when needed"; used for the
// catch-all `other` bucket. The overview query computes `nextDueAt` as
// `lastAppointment.nextDueAt ?? lastAppointment.completedAt + cadenceMonths`
// and flags `isOverdue = nextDueAt < now`.
//
// Numbers are conservative defaults, not medical advice. The admin can
// override any category on a per-appointment basis by setting `nextDueAt`
// explicitly (via the editor or via the sub-agent).
export const MEDICAL_CATEGORY_CADENCE: Record<MedicalCategory, number | null> = {
    dentist: 6,
    gp: 12,
    dermatology: 12,
    eyes: 24,
    mentalHealth: null,
    ent: null,
    physio: null,
    other: null,
};
