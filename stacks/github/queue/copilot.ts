import { Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

export function initializeCopilotQueue(stack: Stack, indexerQueue: Queue): Queue[] {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, GIT_ORGANIZATION_ID } =
    use(commonConfig);
  const ghCopilotIndexDataQueue = new Queue(stack, 'qGhCopilotIndex', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/gh-copilot.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const ghCopilotFormatDataQueue = new Queue(stack, 'qGhCopilotFormat', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/gh-copilot.handler',
        bind: [ghCopilotIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  ghCopilotFormatDataQueue.bind([ghCopilotIndexDataQueue, GIT_ORGANIZATION_ID, indexerQueue]);
  ghCopilotIndexDataQueue.bind([OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  return [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue];
}
