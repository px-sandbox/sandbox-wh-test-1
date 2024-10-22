import { Stack } from 'aws-cdk-lib';
import { Function, Queue,use } from 'sst/constructs';
import { commonConfig } from '../../common/config';

export function createGhDeploymentQueue(
  stack: Stack,
): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);
  const githubDeploymentQueue = new Queue(stack, 'qGhDeploymentFrequency');

  githubDeploymentQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhDeployment', {
      handler: 'packages/github/src/sqs/handlers/formatter/gh-deployment.handler',
      runtime: NODE_VERSION,
      bind: [
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        REQUEST_TIMEOUT,
        githubDeploymentQueue
      ],
    }),

    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  return [githubDeploymentQueue];
}
