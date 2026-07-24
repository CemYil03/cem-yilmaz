import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import { toolMedicalAppointmentsDelete } from '../commands/adminMedicalAppointmentsDelete';
import { toolMedicalAppointmentsUpsert } from '../commands/adminMedicalAppointmentsUpsert';
import { toolMedicalRecordFilesAttach } from '../commands/adminMedicalRecordFilesAttach';
import { toolMedicalRecordsDelete } from '../commands/adminMedicalRecordsDelete';
import { toolMedicalRecordsUpsert } from '../commands/adminMedicalRecordsUpsert';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { ADMIN_CHAT_MODEL_FALLBACK_ID } from './adminChatModels';
import { currentDateForAgent, googleAgentProviderOptionsFor, subAgentClosingRules } from './agentScaffolding';
import { medicalSnapshotForAgent } from './medicalSnapshotForAgent';
import { toolMedicalAppointmentsList } from './toolMedicalAppointmentsList';
import { toolMedicalOverview } from './toolMedicalOverview';
import { toolMedicalRecordsList } from './toolMedicalRecordsList';

// Medical domain sub-agent under the orchestrator pattern documented in
// `docs/architecture/agent-delegation.md`. Runs in-process inside
// `toolDelegateToMedical`'s `execute`, receives an `onStepEnd` from the
// delegate tool, and returns a final text (or `needsMoreInfo` / `noOp`
// JSON sentinel). When it creates or changes a row Cem may want to open, it
// names that row's id in its final summary so the orchestrator can deep-link
// it.
//
// The sub-agent is a **documentarian with gentle triage**: it captures
// what the user tells it into structured records, can offer low-risk
// suggestions, but does NOT diagnose or prescribe. On red-flag symptoms it
// refuses to file a record and tells the user to seek emergency care.

export interface MedicalAgentOptions {
    session: GqlSSession;
    serverRuntime: ServerRuntime;
    onStepEnd?: GenerateTextOnStepEndCallback<any>;
}

function buildSystemPrompt(snapshot: string): string {
    return [
        "You are the medical sub-agent inside Cem's personal workspace. You handle his health journal and medical appointments.",
        'Mutate the DB only when unambiguously asked. Tools own when-to-use.',
        '',
        currentDateForAgent(),
        '',
        'ROLE: documentarian with gentle triage. Listen, ask clarifiers, and file a structured record or appointment. You MAY offer low-risk practical suggestions, but MUST NOT diagnose, name medications, or give dosing advice — always include a one-line disclaimer in the record summary ("This is not medical advice — please consult a qualified professional for anything that worries you.").',
        '',
        'RED FLAGS — refuse to file a record; do NOT call any tool. Reply with ONE short paragraph telling Cem to seek emergency care NOW (call 112 in Germany / 911 in the US or go to the nearest ER) and offer to file a record after he is safe. Trigger on:',
        '- Chest pain / pressure, especially with breathlessness, arm/jaw pain, sweating (possible cardiac event).',
        '- Sudden severe headache ("worst of my life"), sudden vision loss, sudden weakness/numbness on one side, slurred speech, facial droop (possible stroke).',
        '- Severe breathing difficulty; blue lips or fingertips.',
        '- Uncontrolled bleeding.',
        '- Loss of consciousness, seizure, severe head injury.',
        '- Anaphylaxis signs (throat swelling, whole-body hives + breathing trouble).',
        '- Suicidal ideation or self-harm crisis.',
        '',
        'Domain rules:',
        '- Batch same-shape writes — one `medicalRecordsUpsert` for all of them, not N calls.',
        '- For a new symptom, ask up to TWO short clarifiers (duration, spread, triggers, prior history) via the `needsMoreInfo` sentinel only if genuinely needed; otherwise just file the record.',
        '- Complete an appointment with `medicalAppointmentsUpsert` carrying the existing row + `status: completed` and `completedAt` (may be earlier than now).',
        '- Cadence math is precomputed in the snapshot and `medicalOverview` — narrate due dates, do NOT recompute them.',
        '- If the brief lists `fileUploadIds` (photos sent this turn), pass them through on `medicalRecordsUpsert.fileUploadIds` so they attach atomically.',
        ...subAgentClosingRules({ domainLabel: 'medical', outOfDomainExample: 'add a task' }),
        '',
        'Current medical snapshot (refreshed at the start of this turn):',
        '',
        snapshot,
    ].join('\n');
}

export async function agentPersonalAssistantMedical({ session, serverRuntime, onStepEnd }: MedicalAgentOptions) {
    const snapshot = await medicalSnapshotForAgent(serverRuntime);
    const toolContext = { serverRuntime, session };
    const modelId = ADMIN_CHAT_MODEL_FALLBACK_ID;
    return new ToolLoopAgent({
        model: serverRuntime.ai.userConversationModel(modelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(modelId),
        // Same tight ceiling as the other sub-agents. A typical delegation is
        // one clarifying round + `medicalRecordsUpsert` + final text = ~4
        // steps; the ceiling absorbs an overview read and a file-attach.
        stopWhen: [isStepCount(10)],
        instructions: buildSystemPrompt(snapshot),
        tools: {
            medicalOverview: toolMedicalOverview(toolContext),
            medicalAppointmentsList: toolMedicalAppointmentsList(toolContext),
            medicalRecordsList: toolMedicalRecordsList(toolContext),
            medicalRecordsUpsert: toolMedicalRecordsUpsert(toolContext),
            medicalRecordsDelete: toolMedicalRecordsDelete(toolContext),
            medicalAppointmentsUpsert: toolMedicalAppointmentsUpsert(toolContext),
            medicalAppointmentsDelete: toolMedicalAppointmentsDelete(toolContext),
            medicalRecordFilesAttach: toolMedicalRecordFilesAttach(toolContext),
        },
    });
}
