import { Stack } from 'aws-cdk-lib';
import { Bucket, Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { GithubTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeRepoSastErrorQueue(
  stack: Stack,
  sastErrorsBucket: Bucket,
  githubDDb: GithubTables
): Queue[] {
  const {
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
  } = use(commonConfig);
  const repoSastErrorsQueue = new Queue(stack, 'qGhRepoSastError', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhRepoSastError'),
      },
    },
  });
  repoSastErrorsQueue.addConsumer(stack, {
    function: new Function(stack, 'fnRepoSastErrorHandler', {
      handler: 'packages/github/src/sqs/handlers/formatter/repo-sast-errors.handler',
      bind: [
        OPENSEARCH_NODE,
        REQUEST_TIMEOUT,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        sastErrorsBucket,
        repoSastErrorsQueue,
        githubDDb.retryProcessTable,
      ],
      runtime: NODE_VERSION,
    }),
  });

  const repoSastErrorsQueueV2 = new Queue(stack, 'qGhRepoSastErrorV2', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhRepoSastErrorV2'),
      },
    },
  });
  repoSastErrorsQueueV2.addConsumer(stack, {
    function: new Function(stack, 'fnRepoSastErrorHandlerV2', {
      handler: 'packages/github/src/sqs/handlers/formatter/repo-sast-errors-v2.handler',
      bind: [
        OPENSEARCH_NODE,
        REQUEST_TIMEOUT,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        sastErrorsBucket,
        repoSastErrorsQueueV2,
        githubDDb.retryProcessTable,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
      ],
      runtime: NODE_VERSION,
    }),
  });

  return [repoSastErrorsQueue, repoSastErrorsQueueV2];
}
