import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializePushQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue {
  const { GIT_ORGANIZATION_ID, NODE_VERSION } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const pushFormatDataQueue = new Queue(stack, 'qGhPushFormat', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhPushFormat'),
      },
    },
  });
  pushFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPushFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/push.handler',
      bind: [pushFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  pushFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  return pushFormatDataQueue;
}
