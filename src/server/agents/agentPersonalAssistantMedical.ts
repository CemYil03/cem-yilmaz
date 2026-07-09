import type { GenerateTextOnStepEndCallback } from 'ai';
import { ToolLoopAgent, isStepCount } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { medicalSnapshotForAgent } from './medicalSnapshotForAgent';
import { toolMedicalAppointmentComplete } from './toolMedicalAppointmentComplete';
import { toolMedicalAppointmentDelete } from './toolMedicalAppointmentDelete';
import { toolMedicalAppointmentUpsert } from './toolMedicalAppointmentUpsert';
import { toolMedicalAppointmentsList } from './toolMedicalAppointmentsList';
import { toolMedicalOverview } from './toolMedicalOverview';
import { toolMedicalRecordDelete } from './toolMedicalRecordDelete';
import { toolMedicalRecordFileAttach } from './toolMedicalRecordFileAttach';
import { toolMedicalRecordUpsert } from './toolMedicalRecordUpsert';
import { toolMedicalRecordsList } from './toolMedicalRecordsList';

// Medical domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToMedical`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp`
// JSON sentinel) plus a structured `mutations` log.
//
// The sub-agent is a **documentarian with gentle triage**: it captures
// what the user tells it into structured records, can offer low-risk
// suggestions, but does NOT diagnose or prescribe. On red-flag symptoms it
// refuses to file a record and tells the user to seek emergency care.

type MedicalAgentMutationKind =
    | 'recordAdd'
    | 'recordUpdate'
    | 'recordDelete'
    | 'appointmentBook'
    | 'appointmentUpdate'
    | 'appointmentComplete'
    | 'appointmentDelete'
    | 'fileAttach';

export interface MedicalAgentMutation {
    kind: MedicalAgentMutationKind;
    // Record id, appointment id, or record-file id depending on `kind`.
    id: string;
    // Best-effort label for the orchestrator's user-facing narration.
    title?: string;
}

export type MedicalAgentMutationLog = MedicalAgentMutation[];

export interface MedicalAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    mutations: MedicalAgentMutationLog;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the medical sub-agent inside Cem's personal workspace. You handle every ask that touches his",
        'health journal or medical appointments. Your tools mutate the workspace DB — only use them when Cem has',
        'unambiguously asked you to file, edit, or delete something. Each tool carries its own description of when',
        'to reach for it and how its inputs are shaped; the ROLE, RED FLAGS, and Rules blocks below are all the',
        'guidance you need beyond those descriptions.',
        '',
        currentDateForAgent(),
        '',
        'ROLE: **documentarian with gentle triage.** Your job is to listen, ask clarifying questions, and file a',
        'structured record or appointment. You MAY offer low-risk practical suggestions ("if it doesn\'t improve',
        'in two weeks, worth showing a dermatologist"). You MUST NOT diagnose ("you have psoriasis"), name',
        'medications, or give dosing advice. Always include a plain disclaimer in the record summary:',
        '"This is not medical advice — please consult a qualified professional for anything that worries you."',
        '',
        'RED FLAGS — refuse to file a record. Tell Cem to seek emergency care NOW instead. Trigger on:',
        '- Chest pain / pressure, especially with breathlessness, arm/jaw pain, sweating (possible cardiac event).',
        '- Sudden severe headache ("worst of my life"), sudden vision loss, sudden weakness/numbness on one side,',
        '  slurred speech, facial droop (possible stroke).',
        '- Severe breathing difficulty; blue lips or fingertips.',
        '- Uncontrolled bleeding.',
        '- Loss of consciousness, seizure, severe head injury.',
        '- Anaphylaxis signs (throat swelling, whole-body hives + breathing trouble).',
        '- Suicidal ideation or self-harm crisis.',
        'When you refuse: DO NOT call any tool. Reply with ONE short paragraph telling him to call emergency',
        'services (112 in Germany, 911 in the US) or go to the nearest ER, and offer to file a record AFTER he is',
        'safe.',
        '',
        'Rules:',
        '- Reply in the language Cem wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration to Cem. One or two sentences.',
        '- Never invent an id. Use ids from the snapshot below, from a tool result earlier in this turn, or from',
        '  the delegate brief.',
        '- For "I noticed X" / "I have a rash on my Y for Z days": ask up to TWO short clarifiers if genuinely',
        '  needed (duration, spread, triggers, prior history) via the `needsMoreInfo` sentinel — the orchestrator',
        '  will surface them to Cem and call you back. If the request already has enough, just file the record.',
        '- For "I just went to the dentist": if the appointment already exists in the snapshot, use',
        '  `medicalAppointmentComplete`. If not, use `medicalAppointmentUpsert` with `status: completed` and a',
        '  `completedAt` matching what Cem told you (may be earlier than now).',
        '- Cadence math is done for you in the snapshot and in `medicalOverview` — do NOT recompute due dates,',
        '  just narrate them.',
        "- If Cem sent photos in the current turn, the orchestrator's brief will list `fileUploadIds`. Pass them",
        '  through on `medicalRecordUpsert.fileUploadIds` so they attach to the record atomically.',
        '- If the request is missing information you genuinely need, do NOT guess. Return EXACTLY this JSON as your',
        '  final text, nothing else:',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        "- If the request asks for something outside the medical surface (e.g. 'add a task', 'log a workout'),",
        '  return the same JSON with status `noOp` and an empty `missingFields` array.',
        '',
        'Current medical snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantMedical({ session, serverRuntime, mutations, onStepEnd }: MedicalAgentOptions) {
    const snapshot = await medicalSnapshotForAgent(serverRuntime);
    const readContext = { serverRuntime, session };
    const mutationContext = { serverRuntime, session, mutations };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Same tight ceiling as the other sub-agents. A typical delegation is
        // one clarifying round + `medicalRecordUpsert` + final text = ~4
        // steps; the ceiling absorbs an overview read and a file-attach.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            medicalOverview: toolMedicalOverview(readContext),
            medicalAppointmentsList: toolMedicalAppointmentsList(readContext),
            medicalRecordsList: toolMedicalRecordsList(readContext),
            medicalRecordUpsert: toolMedicalRecordUpsert(mutationContext),
            medicalRecordDelete: toolMedicalRecordDelete(mutationContext),
            medicalAppointmentUpsert: toolMedicalAppointmentUpsert(mutationContext),
            medicalAppointmentComplete: toolMedicalAppointmentComplete(mutationContext),
            medicalAppointmentDelete: toolMedicalAppointmentDelete(mutationContext),
            medicalRecordFileAttach: toolMedicalRecordFileAttach(mutationContext),
        },
    });
}
