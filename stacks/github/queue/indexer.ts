import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { GithubTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeIndexerQueue(stack: Stack, githubDDb: GithubTables): Queue {
  const {
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
  } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;
  const indexDataQueue = new Queue(stack, 'qGhIndex', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhIndex'),
      },
    },
  });
  indexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhIndex', {
      handler: 'packages/github/src/sqs/handlers/indexer.handler',
      bind: [
        indexDataQueue,
        retryProcessTable,
        githubMappingTable,
        OPENSEARCH_NODE,
        REQUEST_TIMEOUT,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
      ],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  return indexDataQueue;
}
