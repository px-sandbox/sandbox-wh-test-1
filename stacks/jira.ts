import { Stack } from 'aws-cdk-lib';
import { Api, Config, StackContext, Table, use } from 'sst/constructs';
import { commonConfig } from './common/config';
import { initializeJiraQueue } from './queue/jira';

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
  const JIRA_CALLBACK_URL = new Config.Secret(stack, 'JIRA_CALLBACK_URL');
  const table = new Table(stack, 'jira-token', {
    fields: {
      processId: 'string',
    },
    primaryIndex: { partitionKey: 'processId' },
  });

  // Initialize DynamoDB Tables for Jira
  const { jiraMappingTable } = initializeDynamoDBTables(stack);

  // Initialize SQS Queues for Jira
  const formatQueueList = initializeJiraQueue(stack, jiraMappingTable);

  const jiraApi = new Api(stack, 'jiraApi', {
    defaults: {
      function: {
        timeout: '30 seconds',
        bind: [
          ...formatQueueList,
          OPENSEARCH_NODE,
          OPENSEARCH_PASSWORD,
          OPENSEARCH_USERNAME,
          JIRA_CLIENT_ID,
          JIRA_CLIENT_SECRET,
          JIRA_CALLBACK_URL,
          table,
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
      'GET /jira/initialize': {
        function: 'packages/jira/src/service/authentication.handler',
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
