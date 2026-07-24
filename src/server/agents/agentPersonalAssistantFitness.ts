import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolExercisesDelete } from '../commands/adminFitnessExercisesDelete';
import { toolExercisesUpsert } from '../commands/adminFitnessExercisesUpsert';
import { toolWorkoutRoutineItemsDelete } from '../commands/adminFitnessWorkoutRoutineItemsDelete';
import { toolWorkoutRoutineItemsUpsert } from '../commands/adminFitnessWorkoutRoutineItemsUpsert';
import { toolWorkoutRoutinesDelete } from '../commands/adminFitnessWorkoutRoutinesDelete';
import { toolWorkoutRoutinesUpsert } from '../commands/adminFitnessWorkoutRoutinesUpsert';
import { toolWorkoutSessionsDelete } from '../commands/adminFitnessWorkoutSessionsDelete';
import { toolWorkoutSessionsUpsert } from '../commands/adminFitnessWorkoutSessionsUpsert';
import { toolWorkoutSetsDelete } from '../commands/adminFitnessWorkoutSetsDelete';
import { toolWorkoutSetsUpsert } from '../commands/adminFitnessWorkoutSetsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
import { fitnessSnapshotForAgent } from './fitnessSnapshotForAgent';
import { toolExercisesList } from './toolExercisesList';
import { toolRoutinesList } from './toolRoutinesList';
import { toolWorkoutSessionsList } from './toolWorkoutSessionsList';

// Fitness domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToFitness`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel). When it creates or changes a row Cem may want to open, it names
// that row's id in its final summary so the orchestrator can deep-link it.
//
// It owns three surfaces: the exercise catalog (`Exercises`), reusable
// routines (`WorkoutRoutines` + items), and the gym log (`WorkoutSessions` +
// `WorkoutSets`). The signature use-cases are logging a workout from chat and
// answering progression questions ("what did I bench last time?") — the
// snapshot pre-computes each exercise's last and best working set so the agent
// answers without a list call.

export interface FitnessAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the fitness sub-agent inside Cem's personal workspace. You handle training: the exercise catalog, reusable routines, and the gym log (weight × reps per set).",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'Domain rules:',
        '- Logging a workout ("I did 5×5 squats at 100kg today"): `workoutSessionsUpsert` (one row, today\'s date), then `workoutSetsUpsert` with all sets using the session\'s `referenceIds` as parent `sessionId`. "5×5" means five set rows with reps 5. Two tool calls, not eleven.',
        '- If an exercise is not in the catalog snapshot, create it first with `exercisesUpsert`, then use its returned id when logging sets or building a routine.',
        '- Progression questions ("what did I bench last time?"): answer from the snapshot, which lists each exercise\'s last and best working set. Only call `workoutSessionsList` for the full set-by-set history.',
        '- Building a routine: `workoutRoutinesUpsert` (header) → `workoutRoutineItemsUpsert` (its exercises with targets), using the returned `routineId`.',
        '- Weights are in kilograms unless Cem says otherwise; half-kg increments are fine.',
        ...subAgentClosingRules({ domainLabel: 'fitness', outOfDomainExample: 'log what I ate' }),
        '',
        'Current fitness snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantFitness({ session, serverRuntime, onStepEnd }: FitnessAgentOptions) {
    const snapshot = await fitnessSnapshotForAgent(serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            exercisesList: toolExercisesList(toolContext),
            routinesList: toolRoutinesList(toolContext),
            workoutSessionsList: toolWorkoutSessionsList(toolContext),
            exercisesUpsert: toolExercisesUpsert(toolContext),
            exercisesDelete: toolExercisesDelete(toolContext),
            workoutRoutinesUpsert: toolWorkoutRoutinesUpsert(toolContext),
            workoutRoutinesDelete: toolWorkoutRoutinesDelete(toolContext),
            workoutRoutineItemsUpsert: toolWorkoutRoutineItemsUpsert(toolContext),
            workoutRoutineItemsDelete: toolWorkoutRoutineItemsDelete(toolContext),
            workoutSessionsUpsert: toolWorkoutSessionsUpsert(toolContext),
            workoutSessionsDelete: toolWorkoutSessionsDelete(toolContext),
            workoutSetsUpsert: toolWorkoutSetsUpsert(toolContext),
            workoutSetsDelete: toolWorkoutSetsDelete(toolContext),
        },
    });
}
