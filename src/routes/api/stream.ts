import { createFileRoute } from '@tanstack/react-router';
import { executeGraphQLSubscription } from '../../server/graphql/server';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import type { GqlSSession } from '../../server/graphql/generated';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { loggerCreate } from '../../server/utils/loggerCreate';

const log = loggerCreate(db);

function createSubscriptionStream(
    controller: ReadableStreamDefaultController<Uint8Array>,
    query: string,
    variables: Record<string, any>,
    session: GqlSSession,
) {
    const encoder = new TextEncoder();
    let activeSubscriptionIterator: AsyncIterator<any> | null = null;

    // Initial padding forces proxies (e.g. nginx) to flush early so the client
    // receives the open event immediately instead of after the proxy buffer
    // fills.
    const initialPadding = ' '.repeat(2048);
    controller.enqueue(encoder.encode(`: connected${initialPadding}\n\n`));

    let eventId = 0;
    (async () => {
        try {
            const subscriptionIterator = await executeGraphQLSubscription(query, variables, session);
            activeSubscriptionIterator = subscriptionIterator;

            for await (const result of subscriptionIterator) {
                if (controller.desiredSize === null) {
                    break;
                }

                // GraphQL SSE wire format: id + named "next" event + JSON ExecutionResult.
                const sseData = result;
                const data = `id: ${++eventId}\nevent: next\ndata: ${JSON.stringify(sseData)}\n\n`;

                try {
                    controller.enqueue(encoder.encode(data));
                } catch (enqueueError: any) {
                    if (enqueueError.message?.includes('closed') || enqueueError.code === 'ERR_INVALID_STATE') {
                        break;
                    }
                    throw enqueueError;
                }
            }
        } catch (iterError: any) {
            if (controller.desiredSize !== null) {
                const errorData = `data: ${JSON.stringify({ errors: [{ message: iterError.message }] })}\n\n`;
                try {
                    controller.enqueue(encoder.encode(errorData));
                    controller.close();
                } catch {
                    // Already closed by a concurrent cancel — nothing to clean up.
                }
            }
        }
    })();

    return {
        cleanup: () => {
            if (activeSubscriptionIterator && typeof activeSubscriptionIterator.return === 'function') {
                activeSubscriptionIterator.return();
            }
        },
    };
}

export const Route = createFileRoute('/api/stream')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                const session = await sessionUpsert(db, log, existingSessionId, request.headers.get('user-agent'));

                try {
                    const body = await request.json();
                    const query = body.query || null;
                    const variables = body.variables || undefined;

                    if (!query) {
                        return new Response(
                            JSON.stringify({
                                errors: [{ message: 'Missing query parameter' }],
                            }),
                            {
                                status: 400,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session),
                                },
                            },
                        );
                    }

                    let subscriptionCleanup: (() => void) | null = null;

                    const stream = new ReadableStream({
                        start(controller) {
                            try {
                                const subscription = createSubscriptionStream(controller, query, variables, session);
                                subscriptionCleanup = subscription.cleanup;
                            } catch (error: any) {
                                const errorData = `data: ${JSON.stringify({ errors: [{ message: error.message }] })}\n\n`;
                                controller.enqueue(new TextEncoder().encode(errorData));
                                controller.close();
                            }
                        },
                        cancel() {
                            if (subscriptionCleanup) {
                                subscriptionCleanup();
                            }
                        },
                    });

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream; charset=utf-8',
                            // Disable buffering/proxy transforms to keep SSE flowing in production
                            'Cache-Control': 'no-cache, no-transform',
                            Connection: 'keep-alive',
                            'X-Accel-Buffering': 'no',
                            'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session),
                        },
                    });
                } catch (error: any) {
                    return new Response(JSON.stringify({ errors: [{ message: error.message }] }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session),
                        },
                    });
                }
            },
        },
    },
});
