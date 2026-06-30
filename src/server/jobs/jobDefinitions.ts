import { emailToCemSend } from './handlers/emailToCemSend';
import { compassAnalyze } from './handlers/compassAnalyze';
import { compassInterviewWeeklyDue } from './handlers/compassInterviewWeeklyDue';
import { compassSynthesize } from './handlers/compassSynthesize';
import { projectRequestNotifySend } from './handlers/projectRequestNotifySend';
import { projectRequestOtpSend } from './handlers/projectRequestOtpSend';
import { staleSessionsCleanup } from './handlers/staleSessionsCleanup';
import { signupReminderSend } from './handlers/signupReminderSend';
import type { JobDefinition } from './types';

export const jobDefinitions: JobDefinition[] = [
    staleSessionsCleanup,
    signupReminderSend,
    compassAnalyze,
    compassSynthesize,
    compassInterviewWeeklyDue,
    emailToCemSend,
    projectRequestOtpSend,
    projectRequestNotifySend,
];
