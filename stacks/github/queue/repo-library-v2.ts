import { Duration, Stack } from 'aws-cdk-lib';
import { Bucket, Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

// eslint-disable-next-line max-lines-per-function,
export function initializeRepoLibraryQueueV2(
  stack: Stack,
  githubDDb: GithubTables,
  versionUpgradeBucket: Bucket,
  existingMasterLibraryQueue: Queue
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
  const { retryProcessTable, libMasterTable, githubMappingTable } = githubDDb;

  const repoLibS3Queue = new Queue(stack, 'qRepoLibS3V2', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qRepoLibS3V2'),
        visibilityTimeout: Duration.seconds(65),
      },
    },
  });
  repoLibS3Queue.addConsumer(stack, {
    function: new Function(stack, 'fnRepoLibS3V2', {
      handler: 'packages/github/src/sqs/handlers/repo-library/from-s3-repo-library-v2.handler',
      bind: [
        repoLibS3Queue,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID
      ],
      runtime: NODE_VERSION,
      timeout: '60 seconds',
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  repoLibS3Queue.bind([
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    versionUpgradeBucket,
    retryProcessTable,
    GIT_ORGANIZATION_ID,
    libMasterTable,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID
  ]);
  existingMasterLibraryQueue.bind([
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    githubMappingTable,
    libMasterTable,
  ]);

  return [existingMasterLibraryQueue, repoLibS3Queue];
}
