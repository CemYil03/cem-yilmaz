import type { ServerRuntime } from '../domain/ServerRuntime';

export type JobHandler<TData = unknown> = (args: { data: TData; serverRuntime: ServerRuntime }) => Promise<void>;

export interface RecurringJobDefinition<TData = unknown> {
    kind: 'recurring';
    name: string;
    cron: string;
    handler: JobHandler<TData>;
    options?: {
        retryLimit?: number;
        retryDelay?: number;
        expireInSeconds?: number;
    };
}

export interface QueuedJobDefinition<TData = unknown> {
    kind: 'queued';
    name: string;
    handler: JobHandler<TData>;
    options?: {
        retryLimit?: number;
        retryDelay?: number;
        expireInSeconds?: number;
    };
}

export type JobDefinition = RecurringJobDefinition<any> | QueuedJobDefinition<any>;
