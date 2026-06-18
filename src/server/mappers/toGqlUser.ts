import type { User } from '../db/schema';
import type { GqlSUser } from '../graphql/generated';

export function toGqlUser(user: User): GqlSUser {
    return {
        userId: user.userId,
        name: user.name,

        // resolved fields
    };
}
