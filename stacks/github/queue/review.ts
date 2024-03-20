import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

// eslint-disable-next-line max-lines-per-function,
export function initializePrReviewAndCommentsQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue[] {
  const {
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
  } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const prReviewCommentFormatDataQueue = new Queue(stack, 'qGhPrReviewCommentFormat');
  prReviewCommentFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPrReviewCommentFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/pr-review-comment.handler',
      bind: [prReviewCommentFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const prReviewFormatDataQueue = new Queue(stack, 'qGhPrReviewFormat');
  prReviewFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPrReviewFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/pr-review.handler',
      bind: [prReviewFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const prReviewCommentMigrationQueue = new Queue(stack, 'qGhPrReviewCommentMigration');
  prReviewCommentMigrationQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhPrReviewCommentMigration', {
      handler: 'packages/github/src/sqs/handlers/historical/pr-review-comment.handler',
      bind: [prReviewCommentMigrationQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  prReviewCommentFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  prReviewFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  prReviewCommentMigrationQueue.bind([
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  return [prReviewCommentFormatDataQueue, prReviewFormatDataQueue, prReviewCommentMigrationQueue];
}
