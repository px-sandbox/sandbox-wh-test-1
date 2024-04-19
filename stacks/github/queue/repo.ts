import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

// eslint-disable-next-line max-lines-per-function,
export function initializeRepoQueue(
  stack: Stack,
  githubDDb: GithubTables,
  branchFormatDataQueue: Queue,
  indexerQueue: Queue
): Queue[] {
  const {
    GIT_ORGANIZATION_ID,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_SG_INSTALLATION_ID,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const repoFormatDataQueue = new Queue(stack, 'qGhRepoFormat', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhRepoFormat'),
      },
    },
  });
  repoFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnRepoFormat', {
      handler: 'packages/github/src/sqs/handlers/formatter/repo.handler',
      bind: [repoFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const afterRepoSaveQueue = new Queue(stack, 'qGhAfterRepoSave', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/save-branches.handler',
      cdk: {
        eventSource: {
          batchSize: 1,
        },
      },
    },
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qGhAfterRepoSave'),
      },
    },
  });

  repoFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  afterRepoSaveQueue.bind([
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    branchFormatDataQueue,
    indexerQueue,
    REQUEST_TIMEOUT,
  ]);
  return [repoFormatDataQueue, afterRepoSaveQueue];
}
