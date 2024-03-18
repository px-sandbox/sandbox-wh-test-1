import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializePrQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue {
  const {
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    NODE_VERSION,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
  } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const prFormatDataQueue = new Queue(stack, 'qGhPrFormat', {
    cdk: {
      queue: {
        fifo: true,
      },
    },
  });
  prFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPrFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
      timeout: '30 seconds',
      bind: [prFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  prFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    indexerQueue,
  ]);

  return prFormatDataQueue;
}
