import { Queue, Function, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { getDeadLetterQ } from '../../common/dead-letter-queue';
import { JiraTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializeCycleTimeQueue(
  stack: Stack,
  jiraDDB: JiraTables,
  jiraIndexDataQueue: Queue
): Queue {
  const { NODE_VERSION } = use(commonConfig);
  const cycleTimeFormatDataQueue = new Queue(stack, 'qCycleTimeFormat', {
    cdk: {
      queue: {
        fifo: true,
        deadLetterQueue: getDeadLetterQ(stack, 'qCycleTimeFormat', true),
      },
    },
  });
  cycleTimeFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnCycleTimeFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/cycle-time.handler',
      bind: [
        cycleTimeFormatDataQueue,
        jiraIndexDataQueue,
        jiraDDB.jiraCredsTable,
        jiraDDB.jiraMappingTable,
        jiraDDB.retryProcessTable,
      ],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  return cycleTimeFormatDataQueue;
}
