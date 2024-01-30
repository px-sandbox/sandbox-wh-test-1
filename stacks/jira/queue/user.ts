import { Function, Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

export function initializeUserQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    NODE_VERSION
  } = use(commonConfig);

  const userIndexDataQueue = new Queue(stack, 'qUserIndex', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer/user.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const userFormatDataQueue = new Queue(stack, 'qUserFormat');
  userFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnUserFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/user.handler',
      bind: [userFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  userFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    userIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  ]);
  userIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  return [userFormatDataQueue, userIndexDataQueue];
}
