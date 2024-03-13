import { Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

export function initializeCopilotQueue(stack: Stack, indexerQueue: Queue): Queue {
  const { GIT_ORGANIZATION_ID } = use(commonConfig);

  const ghCopilotFormatDataQueue = new Queue(stack, 'qGhCopilotFormat', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/gh-copilot.handler',
        bind: [GIT_ORGANIZATION_ID, indexerQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  return ghCopilotFormatDataQueue;
}
