/**
 * PubSubPostgres - why this file looks the way it does
 *
 * Summary of findings and fixes from the NOTIFY/LISTEN investigation:
 *
 * 1) Case folding mismatch (root cause)
 *    - LISTEN uses a PostgreSQL identifier; unquoted identifiers are folded to lower case.
 *    - pg_notify(channel, payload) takes a TEXT channel and does NOT fold case.
 *    - If LISTEN is done on an unquoted identifier and pg_notify is called with mixed case,
 *      the channels do NOT match and no notifications are received.
 *    - We normalize all triggers to lower case and always send notifications via
 *      `SELECT pg_notify($1, $2)` with the normalized trigger. This removes all
 *      identifier vs text case differences.
 *
 * 2) Dedicated listener connection (recommended by pg maintainers)
 *    - LISTEN requires a long-lived connection that is not shared or recycled.
 *    - A pooled client can break notifications because the pool may reassign or close it.
 *    - We create a dedicated `pg.Client` for the listener connection and keep it open.
 *      The pool is used only for publishing and regular queries.
 *
 * If you change anything related to channel names or LISTEN/NOTIFY semantics,
 * make sure to preserve the lower-case normalization + pg_notify usage.
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import type { Notification, Pool } from 'pg';
import type { Database } from '../db';
import { environmentVariables } from '../env/environmentVariablesCreate';

type MessageHandler = (payload: unknown) => unknown;

const defaultMessageHandler: MessageHandler = (payload) => payload;

type SubscriptionEntry = {
    trigger: string;
    handler: (payload: unknown) => void;
};

export type PubSubLike = {
    publish: (triggerName: string, payload: unknown) => Promise<void>;
    subscribe: (triggerName: string, onMessage: (payload: unknown) => void) => Promise<string>;
    unsubscribe: (subId: string) => Promise<void>;
    asyncIterator: <TPayload>(triggers: string | Array<string>) => AsyncIterableIterator<TPayload>;
    asyncIterableIterator: <TPayload>(triggers: string | Array<string>) => AsyncIterableIterator<TPayload>;
};

/* -------------------------------------------------------------------------- */
/*                               Async Iterator                               */
/* -------------------------------------------------------------------------- */

function createAsyncIterator<TPayload>(
    emitter: EventEmitter,
    triggers: Array<string>,
    setup: Promise<void>,
    cleanup: () => Promise<void>,
): AsyncIterableIterator<TPayload> {
    let active = true;
    const pullQueue: Array<(value: IteratorResult<TPayload>) => void> = [];
    const pushQueue: Array<TPayload> = [];

    const onMessage = (payload: TPayload) => {
        if (!active) return;

        if (pullQueue.length > 0) {
            pullQueue.shift()?.({ value: payload, done: false });
        } else {
            pushQueue.push(payload);
        }
    };

    for (const trigger of triggers) {
        emitter.on(trigger, onMessage);
    }

    const dispose = async () => {
        if (!active) return;
        active = false;

        for (const trigger of triggers) {
            emitter.off(trigger, onMessage);
        }

        await cleanup();

        while (pullQueue.length > 0) {
            pullQueue.shift()?.({ value: undefined as TPayload, done: true });
        }

        pushQueue.length = 0;
    };

    return {
        async next() {
            if (!active) {
                return { value: undefined as TPayload, done: true };
            }

            await setup;

            if (pushQueue.length > 0) {
                return { value: pushQueue.shift() as TPayload, done: false };
            }

            return new Promise<IteratorResult<TPayload>>((resolve) => {
                pullQueue.push(resolve);
            });
        },

        async return() {
            await dispose();
            return { value: undefined as TPayload, done: true };
        },

        async throw(error) {
            await dispose();
            throw error;
        },

        [Symbol.asyncIterator]() {
            return this;
        },
    };
}

/* -------------------------------------------------------------------------- */
/*                                PubSub Class                                */
/* -------------------------------------------------------------------------- */

export class PubSubMemory implements PubSubLike {
    private readonly emitter = new EventEmitter();
    private readonly subscriptions = new Map<string, SubscriptionEntry>();

    constructor() {
        this.emitter.setMaxListeners(1000);
    }

    publish(triggerName: string, payload: unknown): Promise<void> {
        const trigger = this.normalizeTrigger(triggerName);
        this.emitter.emit(trigger, payload);
        return Promise.resolve();
    }

    subscribe(triggerName: string, onMessage: (payload: unknown) => void): Promise<string> {
        const trigger = this.normalizeTrigger(triggerName);
        const id = randomUUID();
        const handler = (payload: unknown) => onMessage(payload);

        this.emitter.on(trigger, handler);
        this.subscriptions.set(id, { trigger, handler });

        return Promise.resolve(id);
    }

    unsubscribe(subId: string): Promise<void> {
        const entry = this.subscriptions.get(subId);
        if (!entry) return Promise.resolve();

        this.subscriptions.delete(subId);
        this.emitter.off(entry.trigger, entry.handler);
        return Promise.resolve();
    }

    asyncIterator<TPayload>(triggers: string | Array<string>): AsyncIterableIterator<TPayload> {
        const triggerList = (Array.isArray(triggers) ? triggers : [triggers]).map((t) => this.normalizeTrigger(t));
        return createAsyncIterator<TPayload>(this.emitter, triggerList, Promise.resolve(), () => Promise.resolve());
    }

    asyncIterableIterator<TPayload>(triggers: string | Array<string>) {
        return this.asyncIterator<TPayload>(triggers);
    }

    private normalizeTrigger(trigger: string): string {
        return trigger.toLowerCase();
    }
}

export class PubSubPostgres implements PubSubLike {
    private readonly pool: Pool;
    private readonly emitter = new EventEmitter();
    private readonly messageHandler: MessageHandler;
    private readonly listenerConnectionString?: string;

    private readonly subscriptions = new Map<string, SubscriptionEntry>();
    private readonly triggerCounts = new Map<string, number>();
    private readonly triggerLocks = new Map<string, Promise<void>>();

    private listenerClient?: Client;
    private listenerReady?: Promise<void>;

    constructor(options: { db: Database; pool?: Pool; messageHandler?: MessageHandler; listenerConnectionString?: string }) {
        this.pool = options.pool ?? (options.db as { $client: Pool }).$client;
        this.messageHandler = options.messageHandler ?? defaultMessageHandler;
        this.listenerConnectionString = options.listenerConnectionString ?? environmentVariables.databaseUrl;

        this.emitter.setMaxListeners(1000);
        this.listenerReady = this.initListener();
    }

    /* ------------------------------------------------------------------------ */
    /*                                 Public API                               */
    /* ------------------------------------------------------------------------ */

    async publish(triggerName: string, payload: unknown): Promise<void> {
        const trigger = this.normalizeTrigger(triggerName);
        const text = payload === undefined ? null : JSON.stringify(payload);
        await this.pool.query('SELECT pg_notify($1, $2)', [trigger, text]);
    }

    async subscribe(triggerName: string, onMessage: (payload: unknown) => void): Promise<string> {
        const trigger = this.normalizeTrigger(triggerName);
        await this.listen(trigger);

        const id = randomUUID();
        const handler = (payload: unknown) => onMessage(payload);

        this.emitter.on(trigger, handler);
        this.subscriptions.set(id, { trigger, handler });

        return id;
    }

    async unsubscribe(subId: string): Promise<void> {
        const entry = this.subscriptions.get(subId);
        if (!entry) return;

        this.subscriptions.delete(subId);
        this.emitter.off(entry.trigger, entry.handler);

        await this.unlisten(entry.trigger);
    }

    asyncIterator<TPayload>(triggers: string | Array<string>): AsyncIterableIterator<TPayload> {
        const triggerList = (Array.isArray(triggers) ? triggers : [triggers]).map((t) => this.normalizeTrigger(t));

        // 🔒 IMPORTANT:
        // Ensure LISTEN is established BEFORE returning the iterator
        const setupPromise = (async () => {
            await Promise.all(triggerList.map((trigger) => this.listen(trigger)));
        })();

        const cleanup = async () => {
            await Promise.all(triggerList.map((trigger) => this.unlisten(trigger)));
        };

        return createAsyncIterator<TPayload>(this.emitter, triggerList, setupPromise, cleanup);
    }

    asyncIterableIterator<TPayload>(triggers: string | Array<string>) {
        return this.asyncIterator<TPayload>(triggers);
    }

    /* ------------------------------------------------------------------------ */
    /*                               Listener Logic                              */
    /* ------------------------------------------------------------------------ */

    private async initListener(): Promise<void> {
        if (!this.listenerConnectionString) {
            throw new Error('PubSubPostgres requires DATABASE_URL for listener connection');
        }

        this.listenerClient = new Client({ connectionString: this.listenerConnectionString });
        await this.listenerClient.connect();

        this.listenerClient.on('notification', this.handleNotification);
        this.listenerClient.on('error', this.handleListenerError);
        this.listenerClient.on('end', this.handleListenerError);

        for (const trigger of this.triggerCounts.keys()) {
            await this.listenerClient.query(`LISTEN "${trigger}"`);
        }
    }

    private async ensureListener(): Promise<void> {
        if (!this.listenerReady) {
            this.listenerReady = this.initListener();
        }
        await this.listenerReady;
    }

    private async listen(trigger: string): Promise<void> {
        await this.withTriggerLock(trigger, async () => {
            const count = this.triggerCounts.get(trigger) ?? 0;
            if (count === 0) {
                await this.ensureListener();
                await this.listenerClient!.query(`LISTEN "${trigger}"`);
            }
            this.triggerCounts.set(trigger, count + 1);
        });
    }

    private async unlisten(trigger: string): Promise<void> {
        await this.withTriggerLock(trigger, async () => {
            const count = this.triggerCounts.get(trigger);
            if (!count) return;

            if (count === 1) {
                this.triggerCounts.delete(trigger);
                await this.listenerClient?.query(`UNLISTEN "${trigger}"`);
            } else {
                this.triggerCounts.set(trigger, count - 1);
            }
        });
    }

    private withTriggerLock(trigger: string, fn: () => Promise<void>): Promise<void> {
        const prev = this.triggerLocks.get(trigger) ?? Promise.resolve();

        const next = prev.then(fn).finally(() => {
            if (this.triggerLocks.get(trigger) === next) {
                this.triggerLocks.delete(trigger);
            }
        });

        this.triggerLocks.set(trigger, next);
        return next;
    }

    /* ------------------------------------------------------------------------ */
    /*                              Event Handlers                               */
    /* ------------------------------------------------------------------------ */

    private handleNotification = (notification: Notification) => {
        const channel = notification.channel;
        if (!channel) return;
        const trigger = this.normalizeTrigger(channel);

        let payload: unknown;
        try {
            payload = this.messageHandler(this.parsePayload(notification.payload));
        } catch (err) {
            console.error('PubSub messageHandler error', err);
            return;
        }

        this.emitter.emit(trigger, payload);
    };

    private handleListenerError = (error?: Error) => {
        if (error) {
            console.error('Postgres PubSub listener error', error);
        }

        if (this.listenerClient) {
            this.listenerClient.off('notification', this.handleNotification);
            this.listenerClient.off('error', this.handleListenerError);
            this.listenerClient.off('end', this.handleListenerError);
            void this.listenerClient.end().catch((endError) => {
                console.error('Postgres PubSub listener end error', endError);
            });
        }

        this.listenerClient = undefined;
        this.listenerReady = undefined;
    };

    /* ------------------------------------------------------------------------ */
    /*                                 Utilities                                 */
    /* ------------------------------------------------------------------------ */

    private parsePayload(payload: string | null | undefined): unknown {
        if (payload == null) return null;
        try {
            return JSON.parse(payload);
        } catch {
            return payload;
        }
    }

    private normalizeTrigger(trigger: string): string {
        return trigger.toLowerCase();
    }
}
