import { Queue, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

export function initializeBoardQueue(stack: Stack, jiraDDB: Table): Queue[] {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);

  // const boardMigrateQueue = new Queue(stack, 'jira_board_migrate', {
  //   consumer: {
  //     function: 'packages/jira/src/migrations/board.handler',
  //     cdk: {
  //       eventSource: {
  //         batchSize: 5,
  //       },
  //     },
  //   },
  // });

  const boardIndexDataQueue = new Queue(stack, 'jira_board_index', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer/board.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const boardFormatDataQueue = new Queue(stack, 'jira_board_format', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/formatter/board.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  // boardMigrateQueue.bind([
  //   jiraDDB,
  //   boardFormatDataQueue,
  //   OPENSEARCH_NODE,
  //   OPENSEARCH_PASSWORD,
  //   OPENSEARCH_USERNAME,
  // ]);

  boardFormatDataQueue.bind([
    jiraDDB,
    boardIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  boardIndexDataQueue.bind([jiraDDB, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  return [boardFormatDataQueue, boardIndexDataQueue];
}
