import { Stack } from 'aws-cdk-lib';
import { Api, Cron, Function, StackContext, Table, use } from 'sst/constructs';
import { commonConfig } from '../common/config';
import { initializeSprintQueue } from './queue/sprint';
import { initializeProjectQueue } from './queue/project';
import { initializeUserQueue } from './queue/user';
import { initializeBoardQueue } from './queue/board';
import { initializeIssueQueue } from './queue/issue';
import { initializeMigrateQueue } from './queue/migrate';

function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
  const tables = {} as Record<string, Table>;
  tables.jiraMappingTable = new Table(stack, 'jiraMapping', {
    fields: {
      parentId: 'string',
      jiraId: 'string'
    },
    globalIndexes: {
      jiraIndex: { partitionKey: 'jiraId' }
    },
    primaryIndex: { partitionKey: 'parentId' },
  });
  tables.jiraCredsTable = new Table(stack, 'jiraCreds', {
    fields: {
      id: 'string',
    },
    primaryIndex: { partitionKey: 'id' },
  });

  tables.processJiraRetryTable = new Table(stack, 'jiraProcessRetry', {
    fields: {
      processId: 'string',
    },
    primaryIndex: { partitionKey: 'processId' },
  });

  return tables;
}

function intializeJiraCron(
  stack: Stack,
  // eslint-disable-next-line @typescript-eslint/ban-types
  processJiraRetryFunction: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  refreshToken: Function
): void {
  /**
   * Initialized cron job for every 1/2 hour to fetch failed processes from `jiraRetryProcessTable` Table
   * and process them out
   * Cron Expression : cron(Minutes Hours Day-of-month Month Day-of-week Year)*
   */

  // eslint-disable-next-line no-new
  new Cron(stack, 'failed-process-jira-retry-cron', {
    schedule: 'cron(0/30 * ? * * *)',
    job: processJiraRetryFunction,
  });

  // initialize a cron for jira refresh token that runs every second month at 00:00 UTC
  // eslint-disable-next-line no-new
  new Cron(stack, 'refresh-token-cron', {
    schedule: 'cron(0/45 * ? * * *)',
    job: refreshToken,
  });
}
// eslint-disable-next-line max-lines-per-function,
export function jira({ stack }: StackContext): { jiraApi: Api<Record<string, any>> } {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  } = use(commonConfig);

  const { jiraMappingTable, jiraCredsTable, processJiraRetryTable } =
    initializeDynamoDBTables(stack);

  // Initialize SQS Queues for Jira
  const [sprintFormatter, sprintIndexer] = initializeSprintQueue(stack, {
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable,
  });
  const [projectFormatter, projectIndexer] = initializeProjectQueue(stack, {
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable,
  });
  const [userFormatter, userIndexer] = initializeUserQueue(stack, {
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable,
  });
  const [boardFormatter, boardIndexer] = initializeBoardQueue(stack, {
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable,
  });
  const [issueFormatter, issueIndexer] = initializeIssueQueue(stack, {
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable,
  });

  const [projectMigrateQueue,
    sprintMigrateQueue,
    issueMigrateQueue,
    userMigrateQueue] = initializeMigrateQueue(
      stack,
      {
        jiraMappingTable,
        jiraCredsTable,
        processJiraRetryTable,
      },
      [projectFormatter, sprintFormatter, userFormatter, boardFormatter, issueFormatter]
    );

  const refreshToken = new Function(stack, 'refresh-token-func', {
    handler: 'packages/jira/src/cron/refresh-token.updateRefreshToken',
    bind: [jiraCredsTable, JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, JIRA_REDIRECT_URI],
  });
  const processJiraRetryFunction = new Function(stack, 'process-jira-retry-func', {
    handler: 'packages/jira/src/cron/process-jira-retry.handler',
    bind: [
      jiraMappingTable,
      jiraCredsTable,
      processJiraRetryTable,
      JIRA_CLIENT_ID,
      JIRA_CLIENT_SECRET,
      userFormatter,
      userIndexer,
      sprintFormatter,
      sprintIndexer,
      projectFormatter,
      projectIndexer,
      issueFormatter,
      issueIndexer,
      boardFormatter,
      boardIndexer,
    ],
  });

  const jiraApi = new Api(stack, 'jiraApi', {
    defaults: {
      function: {
        timeout: '30 seconds',
        bind: [
          userFormatter,
          userIndexer,
          sprintFormatter,
          sprintIndexer,
          boardFormatter,
          boardIndexer,
          projectFormatter,
          projectIndexer,
          issueFormatter,
          issueIndexer,
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
    routes: {
      // GET create all Jira indices into ES
      'GET /jira/create-indices': {
        function: 'packages/jira/src/service/create-indices.handler',
      },
      'POST /jira/webhook': {
        function: 'packages/jira/src/webhook/webhook.handler',
      },
      'GET /jira/auth': {
        function: 'packages/jira/src/service/auth.handler',
      },
      'GET /jira/callback': {
        function: 'packages/jira/src/service/callback.handler',
      },
      'GET /jira/graph/first-time-pass-rate': {
        function: 'packages/jira/src/service/ftp-rate.handler',
      },
      // GET Jira project data
      'GET /jira/projects': {
        function: 'packages/jira/src/service/project/get-projects.handler',
      },
      'GET /jira/graph/reopen-rate': {
        function: 'packages/jira/src/service/reopen-rate.handler',
      },
      'GET /jira/migrate': {
        function: {
          handler: 'packages/jira/src/service/migrate.handler',
          bind: [projectMigrateQueue, userMigrateQueue]
        },
      },

      // GET Jira board and sprint data for a project
      'GET /jira/boards': {
        function: 'packages/jira/src/service/board/get-boards.handler',
      },
    },
  });

  // Initialize Cron for Jira
  intializeJiraCron(stack, processJiraRetryFunction, refreshToken);

  stack.addOutputs({
    ApiEndpoint: jiraApi.url,
  });
  return { jiraApi };
}
