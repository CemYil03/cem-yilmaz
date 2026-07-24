import { chatTitleGenerate } from './handlers/chatTitleGenerate';
import { compassAnalyze } from './handlers/compassAnalyze';
import { compassInterviewScheduledDue } from './handlers/compassInterviewScheduledDue';
import { compassSynthesize } from './handlers/compassSynthesize';
import { emailToCemSend } from './handlers/emailToCemSend';
import { projectRequestNotifySend } from './handlers/projectRequestNotifySend';
import { projectRequestOtpSend } from './handlers/projectRequestOtpSend';
import { signupReminderSend } from './handlers/signupReminderSend';
import type { JobDefinition } from './types';

export const jobDefinitions: JobDefinition[] = [
    signupReminderSend,
    compassAnalyze,
    compassSynthesize,
    compassInterviewScheduledDue,
    emailToCemSend,
    projectRequestOtpSend,
    projectRequestNotifySend,
    chatTitleGenerate,
];
