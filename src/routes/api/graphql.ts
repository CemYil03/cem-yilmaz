import { createFileRoute } from '@tanstack/react-router';
import { executeGraphQLQuery } from '../../server/graphql/server';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { loggerCreate } from '../../server/utils/loggerCreate';

const log = loggerCreate(db);

export const Route = createFileRoute('/api/graphql')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                const session = await sessionUpsert(
                    db,
                    log,
                    existingSessionId,
                    request.headers.get('user-agent'),
                    clientIpFromRequest(request),
                );

                try {
                    const body = await request.clone().json();
                    const result = await executeGraphQLQuery(body.query, body.variables, session);

                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
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
