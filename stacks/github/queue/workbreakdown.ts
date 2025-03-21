import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';
import { GithubTables } from '../../type/tables';

export function initializeWorkbreakdownQueue(stack: Stack, githubDDb: GithubTables): Queue {
  const {
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
  } = use(commonConfig);

  const { retryProcessTable } = githubDDb;

  const workbreakdownQueue = new Queue(stack, 'qGhWorkbreakdown', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhWorkbreakdown'),
      },
    },
  });

  workbreakdownQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhWorkbreakdown', {
      handler: 'packages/github/src/sqs/handlers/formatter/workbreakdown.handler',
      bind: [
        OPENSEARCH_NODE,
        REQUEST_TIMEOUT,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        workbreakdownQueue,
        retryProcessTable
      ],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  return workbreakdownQueue;
} 