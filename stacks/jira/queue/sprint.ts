import { Stack } from 'aws-cdk-lib';
import { Queue, Function, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeSprintQueue(
  stack: Stack,
  jiraDDB: JiraTables,
  jiraIndexDataQueue: Queue
): Queue {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    IGNORED_PROJECT_KEYS,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);

  const sprintFormatDataQueue = new Queue(stack, 'qSprintFormat', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qSprintFormat'),
      },
    },
  });
  sprintFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnSprintFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/sprint.handler',
      bind: [sprintFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  sprintFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraIndexDataQueue,
    jiraDDB.retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    IGNORED_PROJECT_KEYS,
    REQUEST_TIMEOUT,
  ]);

  return sprintFormatDataQueue;
}
