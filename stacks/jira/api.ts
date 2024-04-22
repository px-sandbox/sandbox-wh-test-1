import { Function, Queue, use, Api } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../common/config';
import { JiraTables } from '../type/tables';
import { initializeRoutes } from './routes';

// eslint-disable-next-line max-lines-per-function,
export function initializeApi(
  stack: Stack,
  tables: JiraTables,
  queues: Queue[]
): Api<{
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
    AVAILABLE_PROJECT_KEYS,
    PROJECT_DELETION_AGE,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);
  const { jiraMappingTable, jiraCredsTable, retryProcessTable } = tables;
  const [
    projectMigrateQueue,
    userMigrateQueue,
    sprintMigrateQueue,
    issueStatusMigrateQueue,
    issueMigrateQueue,
    issueTimeTrackingMigrationQueue,
    ...restQueues
  ] = queues;
  const routeObj = initializeRoutes(
    {
      projectMigrateQueue,
      userMigrateQueue,
      sprintMigrateQueue,
      issueStatusMigrateQueue,
      issueMigrateQueue,
      issueTimeTrackingMigrationQueue,
    },
    jiraCredsTable
  );
  const jiraApi = new Api(stack, 'jiraApi', {
    authorizers: {
      universal: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'fnUniversalJiraAuth', {
          handler: 'packages/auth/src/auth.handler',
          bind: [AUTH_PUBLIC_KEY],
          runtime: NODE_VERSION,
        }),
      },
      admin: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'fnAdminJiraAuth', {
          handler: 'packages/auth/src/admin-auth.handler',
          bind: [AUTH_PUBLIC_KEY],
          runtime: NODE_VERSION,
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
          retryProcessTable,
          AVAILABLE_PROJECT_KEYS,
          PROJECT_DELETION_AGE,
          REQUEST_TIMEOUT,
        ],
        runtime: NODE_VERSION,
      },
    },
    routes: routeObj,
  });
  return jiraApi;
}
