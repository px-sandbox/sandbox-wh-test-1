import { Stack } from 'aws-cdk-lib';
import { Queue, Function, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

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
    AVAILABLE_PROJECT_KEYS,
    NODE_VERSION,
  } = use(commonConfig);

  const sprintFormatDataQueue = new Queue(stack, 'qSprintFormat');
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
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS,
  ]);

  return sprintFormatDataQueue;
}
