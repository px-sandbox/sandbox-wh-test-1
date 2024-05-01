import { Stack } from 'aws-cdk-lib';
import { Bucket, Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { GithubTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeRepoSastErrorQueue(
  stack: Stack,
  sastErrorsBucket: Bucket,
  githubDDb: GithubTables
): Queue {
  const {
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
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

  return repoSastErrorsQueue;
}
