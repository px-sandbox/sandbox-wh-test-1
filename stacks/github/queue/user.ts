import { Stack } from 'aws-cdk-lib';
import { Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializeUserQueue(
  stack: Stack,
  githubDDb: GithubTables,
  indexerQueue: Queue
): Queue {
  const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } =
    use(commonConfig);
  const { retryProcessTable, githubMappingTable } = githubDDb;

  const userFormatDataQueue = new Queue(stack, 'qGhUsersFormat', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/user.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  userFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    indexerQueue,
  ]);

  return userFormatDataQueue;
}
