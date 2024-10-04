import { Stack } from 'aws-cdk-lib';
import { Function, Queue, Bucket, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';

export function createGhTestCoverageQueue(
  stack: Stack,
  testCoverageReportsBucket: Bucket
): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);
  const testCoverageQueue = new Queue(stack, 'qGhTestCoverage');

  testCoverageQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhTestCoverage', {
      handler: 'packages/github/src/sqs/handlers/formatter/gh-test-coverage.handler',
      runtime: NODE_VERSION,
      bind: [
        testCoverageQueue,
        testCoverageReportsBucket,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        REQUEST_TIMEOUT,
      ],
    }),

    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  return [testCoverageQueue];
}
