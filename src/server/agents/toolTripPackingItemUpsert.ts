import { tool } from 'ai';
import { tripPackingItemUpsert } from '../commands/tripPackingItemUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTripPackingItemInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSTripPackingItemInput } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

// The `rawInput as GqlSTripPackingItemInput` cast recovers TS inference
// from the generated `Properties<T>` phantom — see `toolTripUpsert.ts`. The
// runtime schema still validates against the type.
export function toolTripPackingItemUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: 'Create or edit one packing-list item for a trip. For "mark X as packed" use `tripPackingItemToggle` instead.',
        inputSchema: GqlSTripPackingItemInputSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSTripPackingItemInput;
            const result = await tripPackingItemUpsert(requireAdminUserId(session), input, session, serverRuntime);
            mutations.push({
                kind: input.tripPackingItemId ? 'tripPackingItemUpdate' : 'tripPackingItemAdd',
                id: result.tripPackingItemId,
                title: result.label,
            });
            return result;
        },
    });
}
