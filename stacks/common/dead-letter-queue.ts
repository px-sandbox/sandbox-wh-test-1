import { Duration, Stack } from 'aws-cdk-lib';
import { DeadLetterQueue } from 'aws-cdk-lib/aws-sqs';
import { Queue } from 'sst/constructs';

export function getDeadLetterQ(stack: Stack, name: string, fifo = false): DeadLetterQueue {
  const dlq = new Queue(stack, `${name}-dlq`, {
    cdk: {
      queue: {
        retentionPeriod: Duration.days(14),
        ...(fifo ? { fifo: true } : {}),
      },
    },
  });
  return {
    maxReceiveCount: 3,
    queue: dlq.cdk.queue,
  };
}
