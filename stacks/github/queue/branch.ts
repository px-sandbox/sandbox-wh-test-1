import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeBranchQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue {
  const { GIT_ORGANIZATION_ID, NODE_VERSION } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const branchFormatDataQueue = new Queue(stack, 'qGhBranchFormat', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhBranchFormat'),
      },
    },
  });
  branchFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhBranchFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/branch.handler',
      bind: [branchFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  branchFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  return branchFormatDataQueue;
}
