import { Stack } from 'aws-cdk-lib';
import { Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeBranchQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue {
  const { GIT_ORGANIZATION_ID } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const branchFormatDataQueue = new Queue(stack, 'qGhBranchFormat', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/branch.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhBranchFormat'),
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
