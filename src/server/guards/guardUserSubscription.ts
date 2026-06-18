import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

export function guardUserSubscription(requestingSession: GqlSSession, serverRuntime: ServerRuntime): AsyncIterableIterator<any> {
    if (!requestingSession.userId) {
        throw new Error('Unauthorized');
    }

    return serverRuntime.subscribe.to(requestingSession.userId);
}
