import { emailToCemSend } from './handlers/emailToCemSend';
import { profileAnalyze } from './handlers/profileAnalyze';
import { profileSynthesize } from './handlers/profileSynthesize';
import { projectRequestNotifySend } from './handlers/projectRequestNotifySend';
import { projectRequestOtpSend } from './handlers/projectRequestOtpSend';
import { staleSessionsCleanup } from './handlers/staleSessionsCleanup';
import { signupReminderSend } from './handlers/signupReminderSend';
import type { JobDefinition } from './types';

export const jobDefinitions: JobDefinition[] = [
    staleSessionsCleanup,
    signupReminderSend,
    profileAnalyze,
    profileSynthesize,
    emailToCemSend,
    projectRequestOtpSend,
    projectRequestNotifySend,
];
