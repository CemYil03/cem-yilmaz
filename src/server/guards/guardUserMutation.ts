import type { GqlSSession, GqlSUserMutation } from '../graphql/generated';

export function guardUserMutation(requestingSession: GqlSSession): GqlSUserMutation {
    if (!requestingSession.userId) {
        throw new Error('Unauthorized');
    }

    return {
        userId: requestingSession.userId,
    } as GqlSUserMutation;
}
