// Extracts the client IP from a request's proxy headers.
//
// Production traffic arrives behind a reverse proxy (Coolify → the app
// container) which sets `x-forwarded-for` and `x-real-ip`. We trust the
// first hop of `x-forwarded-for` because that is the client we want to
// rate-limit; the chain after the first comma is a record of intermediate
// proxies, not of clients. `x-real-ip` is the fallback for proxies that
// only set the single-value header.
//
// Returns `null` when neither header is present — typically only in local
// development without a proxy. The visitor-chat rate limiter falls back to
// the session bucket alone in that case (see
// `src/server/queries/visitorChatQuotaFindOne.ts`).
export function clientIpFromRequest(request: Request): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const firstHop = forwardedFor.split(',')[0]?.trim();
        if (firstHop) return firstHop;
    }
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    return null;
}
