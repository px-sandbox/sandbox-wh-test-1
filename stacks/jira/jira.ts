import { Stack } from 'aws-cdk-lib';
import { Api, Config, StackContext, Table, use } from 'sst/constructs';
import { commonConfig } from '../common/config';
import { initializeSprintQueue } from './queue/sprint';
import { initializeProjectQueue } from './queue/project';
import { initializeUserQueue } from './queue/user';

function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
  const tables = {} as Record<string, Table>;
  tables.jiraMappingTable = new Table(stack, 'JiraMapping', {
    fields: {
      parentId: 'string',
      jiraId: 'string',
    },
    globalIndexes: {
      githubIndex: { partitionKey: 'jiraId' },
    },
    primaryIndex: { partitionKey: 'parentId' },
  });
  return tables;
}

// eslint-disable-next-line max-lines-per-function,
export function jira({ stack }: StackContext): { jiraApi: Api<Record<string, any>> } {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
  const JIRA_CLIENT_ID = new Config.Secret(stack, 'JIRA_CLIENT_ID');
  const JIRA_CLIENT_SECRET = new Config.Secret(stack, 'JIRA_CLIENT_SECRET');
  const JIRA_REDIRECT_URI = new Config.Secret(stack, 'JIRA_REDIRECT_URI');

  const table = new Table(stack, 'jiraCreds', {
    fields: {
      id: 'string',
    },
    primaryIndex: { partitionKey: 'id' },
  });

  // Initialize DynamoDB Tables for Jira
  const { jiraMappingTable } = initializeDynamoDBTables(stack);

  // Initialize SQS Queues for Jira
  const sprintQueues = initializeSprintQueue(stack, jiraMappingTable);
  const projectQueues = initializeProjectQueue(stack, jiraMappingTable);
  const userQueues = initializeUserQueue(stack, jiraMappingTable);

  const jiraApi = new Api(stack, 'jiraApi', {
    defaults: {
      function: {
        timeout: '30 seconds',
        bind: [
          ...userQueues,
          ...sprintQueues,
          ...projectQueues,
          OPENSEARCH_NODE,
          OPENSEARCH_PASSWORD,
          OPENSEARCH_USERNAME,
          JIRA_CLIENT_ID,
          JIRA_CLIENT_SECRET,
          JIRA_REDIRECT_URI,
          table,
          jiraMappingTable,
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
    },
  });

  stack.addOutputs({
    ApiEndpoint: jiraApi.url,
  });
  return { jiraApi };
}
