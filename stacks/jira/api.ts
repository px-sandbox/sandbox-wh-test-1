import { Function, Queue, use, Api } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../common/config';
import { JiraTables } from '../type/tables';
import { initializeRoutes } from './routes';

// eslint-disable-next-line max-lines-per-function,
export function initializeApi(stack: Stack, tables: JiraTables, queues: Queue[]): Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
}> {
    const {
        AUTH_PUBLIC_KEY,
        JIRA_CLIENT_ID,
        JIRA_CLIENT_SECRET,
        JIRA_REDIRECT_URI,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    } = use(commonConfig);
    const { jiraMappingTable, jiraCredsTable, processJiraRetryTable } = tables;
    const [projectMigrateQueue, sprintMigrateQueue, issueMigrateQueue, userMigrateQueue, ...restQueues] = queues;
    const routeObj = initializeRoutes([
        projectMigrateQueue,
        sprintMigrateQueue,
        issueMigrateQueue,
        userMigrateQueue
    ],
        jiraCredsTable
    );
    const jiraApi = new Api(stack, 'jiraApi', {
        authorizers: {
            universal: {
                type: 'lambda',
                responseTypes: ['simple'],
                function: new Function(stack, 'Jira-Universal-Authorizer', {
                    handler: 'packages/auth/src/auth.handler',
                    bind: [AUTH_PUBLIC_KEY],
                }),
            },
            admin: {
                type: 'lambda',
                responseTypes: ['simple'],
                function: new Function(stack, 'Jira-Admin-Authorizer', {
                    handler: 'packages/auth/src/admin-auth.handler',
                    bind: [AUTH_PUBLIC_KEY],
                }),
            },
        },
        defaults: {
            authorizer: 'universal',
            function: {
                timeout: '30 seconds',
                bind: [
                    ...restQueues,
                    OPENSEARCH_NODE,
                    OPENSEARCH_PASSWORD,
                    OPENSEARCH_USERNAME,
                    JIRA_CLIENT_ID,
                    JIRA_CLIENT_SECRET,
                    JIRA_REDIRECT_URI,
                    jiraMappingTable,
                    jiraCredsTable,
                    processJiraRetryTable,
                ],
            },
        },
        routes: routeObj,
    });
    return jiraApi;
}