import { Api, StackContext, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
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
          jiraMappingTable,
          OPENSEARCH_NODE,
          OPENSEARCH_PASSWORD,
          OPENSEARCH_USERNAME,
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
    },
  });

  stack.addOutputs({
    ApiEndpoint: jiraApi.url,
  });
  return { jiraApi };
}
