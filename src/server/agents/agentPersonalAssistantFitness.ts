import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { fitnessSnapshotForAgent } from './fitnessSnapshotForAgent';
import { toolExercisesDelete } from './toolExercisesDelete';
import { toolExercisesList } from './toolExercisesList';
import { toolExercisesUpsert } from './toolExercisesUpsert';
import { toolRoutinesList } from './toolRoutinesList';
import { toolWorkoutRoutineItemsDelete } from './toolWorkoutRoutineItemsDelete';
import { toolWorkoutRoutineItemsUpsert } from './toolWorkoutRoutineItemsUpsert';
import { toolWorkoutRoutinesDelete } from './toolWorkoutRoutinesDelete';
import { toolWorkoutRoutinesUpsert } from './toolWorkoutRoutinesUpsert';
import { toolWorkoutSessionsDelete } from './toolWorkoutSessionsDelete';
import { toolWorkoutSessionsList } from './toolWorkoutSessionsList';
import { toolWorkoutSessionsUpsert } from './toolWorkoutSessionsUpsert';
import { toolWorkoutSetsDelete } from './toolWorkoutSetsDelete';
import { toolWorkoutSetsUpsert } from './toolWorkoutSetsUpsert';

// Fitness domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToFitness`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp` JSON
// sentinel) plus a structured `mutations` log.
//
// It owns three surfaces: the exercise catalog (`Exercises`), reusable
// routines (`WorkoutRoutines` + items), and the gym log (`WorkoutSessions` +
// `WorkoutSets`). The signature use-cases are logging a workout from chat and
// answering progression questions ("what did I bench last time?") — the
// snapshot pre-computes each exercise's last and best working set so the agent
// answers without a list call.

type FitnessAgentMutationKind =
    | 'exerciseAdd'
    | 'exerciseUpdate'
    | 'exerciseDelete'
    | 'routineAdd'
    | 'routineUpdate'
    | 'routineDelete'
    | 'routineItemAdd'
    | 'routineItemUpdate'
    | 'routineItemDelete'
    | 'sessionAdd'
    | 'sessionUpdate'
    | 'sessionDelete'
    | 'setAdd'
    | 'setUpdate'
    | 'setDelete';

export interface FitnessAgentMutation {
    kind: FitnessAgentMutationKind;
    // AdminFitnessExercise / routine / routine-item / session / set id depending on `kind`.
    id: string;
    // Best-effort label for the orchestrator's user-facing narration.
    title?: string;
}

export type FitnessAgentMutationLog = FitnessAgentMutation[];

export interface FitnessAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    mutations: FitnessAgentMutationLog;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the fitness sub-agent inside Cem's personal workspace. You handle every ask about training: the",
        'exercise catalog, reusable workout routines, and the gym log (weight × reps per set). Your tools mutate the',
        'workspace DB. Each tool carries its own description of when to reach for it and how its inputs are shaped;',
        'the cross-tool workflow rules below are all the guidance you need beyond those descriptions.',
        '',
        currentDateForAgent(),
        '',
        'Workflow rules:',
        '- Logging a workout ("I did 5×5 squats at 100kg today"): create the session with `workoutSessionsUpsert`',
        '  (one row, today’s date), then `workoutSetsUpsert` with all the sets, using the session’s `referenceIds`',
        '  as the parent `sessionId`. "5×5" means five rows with reps 5. Two tool calls, not eleven.',
        '- If an exercise in the request is not in the catalog snapshot, create it first with `exercisesUpsert`,',
        '  then use its returned id when logging sets or building a routine.',
        '- Progression questions ("what did I bench last time?", "am I getting stronger?"): answer from the',
        '  snapshot, which lists each exercise’s last and best working set. Only call `workoutSessionsList` if you',
        '  need the full set-by-set history.',
        '- Building a routine: `workoutRoutinesUpsert` (header) → `workoutRoutineItemsUpsert` (its exercises with',
        '  targets), using the returned `routineId`.',
        '',
        'General rules:',
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences.',
        '- Never invent an id. Use ids from the snapshot below, from an upsert result’s `referenceIds` earlier in',
        '  this turn (in input order), or omit the id entirely to insert a new row.',
        '- Weights are in kilograms unless Cem says otherwise. Half-kg increments are fine.',
        '- Only ask for clarification when a required field is genuinely missing. In that case return EXACTLY this',
        '  JSON as your final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request is outside fitness (e.g. 'log what I ate'), return the same JSON with status `noOp` and an",
        '  empty `missingFields` array.',
        '',
        'Current fitness snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantFitness({ session, serverRuntime, mutations, onStepEnd }: FitnessAgentOptions) {
    const snapshot = await fitnessSnapshotForAgent(serverRuntime);
    const readContext = { serverRuntime, session };
    const mutationContext = { serverRuntime, session, mutations };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            exercisesList: toolExercisesList(readContext),
            routinesList: toolRoutinesList(readContext),
            workoutSessionsList: toolWorkoutSessionsList(readContext),
            exercisesUpsert: toolExercisesUpsert(mutationContext),
            exercisesDelete: toolExercisesDelete(mutationContext),
            workoutRoutinesUpsert: toolWorkoutRoutinesUpsert(mutationContext),
            workoutRoutinesDelete: toolWorkoutRoutinesDelete(mutationContext),
            workoutRoutineItemsUpsert: toolWorkoutRoutineItemsUpsert(mutationContext),
            workoutRoutineItemsDelete: toolWorkoutRoutineItemsDelete(mutationContext),
            workoutSessionsUpsert: toolWorkoutSessionsUpsert(mutationContext),
            workoutSessionsDelete: toolWorkoutSessionsDelete(mutationContext),
            workoutSetsUpsert: toolWorkoutSetsUpsert(mutationContext),
            workoutSetsDelete: toolWorkoutSetsDelete(mutationContext),
        },
    });
}
