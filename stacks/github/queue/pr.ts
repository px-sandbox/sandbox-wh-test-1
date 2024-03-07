import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializePrQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue[] {
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
  const prIndexDataQueue = new Queue(stack, 'qGhPrIndex');
  prIndexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPrIndex', {
      handler: 'packages/github/src/sqs/handlers/indexer/pull-request.handler',
      bind: [prIndexDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const prFormatDataQueue = new Queue(stack, 'qGhPrFormat');
  prFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPrFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
      timeout: '30 seconds',
      bind: [prFormatDataQueue, prIndexDataQueue],
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
    prIndexDataQueue,
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    indexerQueue,
  ]);

  prIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  return [prFormatDataQueue, prIndexDataQueue];
}
