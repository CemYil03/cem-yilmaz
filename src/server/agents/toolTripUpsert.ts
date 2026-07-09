import { tool } from 'ai';
import { tripUpsert } from '../commands/tripUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { GqlSTripInputSchema } from '../graphql/generated';
import type { GqlSSession, GqlSTripInput } from '../graphql/generated';
import type { TravelAgentMutationLog } from './agentPersonalAssistantTravel';
import { requireAdminUserId } from './requireAdminUserId';

// Direct create-or-edit of a trip. The input schema is the generated
// `GqlSTripInputSchema()` — same shape the GraphQL resolver validates,
// no hand-built duplicate to drift out of sync. Gemini-safe because
// `TripInput` uses `Date` scalars (which the codegen emits as `z.string()`)
// and no `DateTime` fields — see `docs/architecture/agent-delegation.md`.
//
// The `input as GqlSTripInput` cast is a workaround for the generated
// `Properties<T>` phantom in the codegen output: it types the ZodObject as
// `ZodObject<Properties<GqlSTripInput>>`, which `z.infer` cannot round-trip
// back to the concrete `GqlSTripInput` — nullish fields widen to `unknown`.
// The runtime schema DOES validate against the type; the cast just recovers
// TS inference at the boundary.
interface TravelAgentMutationContext {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    mutations: TravelAgentMutationLog;
}

export function toolTripUpsert({ serverRuntime, session, mutations }: TravelAgentMutationContext) {
    return tool({
        description: [
            'Create a new trip or edit an existing one — trip root only (title, destination, dates, status,',
            'transport, accommodation, notes). Set `tripId` to edit; omit it to create. Use this for pure metadata',
            'edits with no nested changes. For a whole-trip plan (days, activities, packing items in one call),',
            'prefer `tripUpsertDeep` instead.',
        ].join(' '),
        inputSchema: GqlSTripInputSchema(),
        execute: async (rawInput) => {
            const input = rawInput as GqlSTripInput;
            const result = await tripUpsert(requireAdminUserId(session), input, session, serverRuntime);
            mutations.push({
                kind: input.tripId ? 'tripUpdate' : 'tripAdd',
                id: result.tripId,
                title: result.title,
            });
            return result;
        },
    });
}
