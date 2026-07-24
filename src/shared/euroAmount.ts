// Form-field helpers for euro amounts stored as integer cents in the DB.
// Distinct from `formatCurrency` (locale-aware display with a currency
// symbol) — these round-trip plain `"12.34"` strings used in controlled
// `<Input>` fields across finances / tax / inventory.

export function centsToEuros(cents: number): string {
    return (cents / 100).toFixed(2);
}

export function eurosToCents(input: string): number | null {
    const trimmed = input.trim().replace(',', '.');
    if (trimmed === '') return null;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) return null;
    return Math.round(parsed * 100);
}
