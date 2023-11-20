import { Queue, use, Function } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

export function initializeBoardQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS
  } = use(commonConfig);

  const boardIndexDataQueue = new Queue(stack, 'qBoardIndex', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer/board.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const boardFormatDataQueue = new Queue(stack, 'qBoardFormat');

  boardFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnBoardFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/board.handler',
      bind: [boardFormatDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  boardFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    boardIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS
  ]);
  boardIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  return [boardFormatDataQueue, boardIndexDataQueue];
}
