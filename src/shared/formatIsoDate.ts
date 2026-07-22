/**
 * Local calendar date → ISO date-only string (YYYY-MM-DD).
 * Matches drizzle `date` column shape; avoids UTC shift from `toISOString().slice(0, 10)`.
 */
export function formatIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
