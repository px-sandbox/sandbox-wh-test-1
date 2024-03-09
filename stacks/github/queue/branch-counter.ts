import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializeBranchCounterQueue(
  stack: Stack,
  githubDDB: GithubTables,
  indexer: Queue
): Queue {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, NODE_VERSION } =
    use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDB;

  const branchCounterFormatterQueue = new Queue(stack, 'qGhActiveBranchCounterFormat');

  branchCounterFormatterQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhActiveBranchCounterFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/active-branch.handler',
      bind: [
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        branchCounterFormatterQueue,
        retryProcessTable,
        githubMappingTable,
        indexer,
      ],
      runtime: NODE_VERSION,
    }),

    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  return branchCounterFormatterQueue;
}
