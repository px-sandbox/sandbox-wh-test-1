import { Stack } from 'aws-cdk-lib';
import { Queue, use, Function } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { GithubTables } from '../../type/tables';
import { initializeDeadLetterQueue } from '../../common/dead-letter-queue';

// eslint-disable-next-line max-lines-per-function,
export function initializeSecurityScanQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_SG_INSTALLATION_ID,
    NODE_VERSION,
  } = use(commonConfig);

  const { retryProcessTable } = githubDDb;
  const scansSaveQueue = new Queue(stack, 'qGhScansSave', {
    cdk: {
      queue: {
        deadLetterQueue: initializeDeadLetterQueue(stack, 'qGhScansSave', false),
      },
    },
  });
  scansSaveQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhScansSave', {
      handler: 'packages/github/src/sqs/handlers/update-security-scans.handler',
      bind: [scansSaveQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  // bind every queue/table which we will call inside scansSaveQueue's handler
  scansSaveQueue.bind([
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    retryProcessTable,
  ]);
  return [scansSaveQueue];
}
