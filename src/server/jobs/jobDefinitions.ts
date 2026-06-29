import { profileAnalyze } from './handlers/profileAnalyze';
import { profileSynthesize } from './handlers/profileSynthesize';
import { staleSessionsCleanup } from './handlers/staleSessionsCleanup';
import { signupReminderSend } from './handlers/signupReminderSend';
import type { JobDefinition } from './types';

export const jobDefinitions: JobDefinition[] = [staleSessionsCleanup, signupReminderSend, profileAnalyze, profileSynthesize];
