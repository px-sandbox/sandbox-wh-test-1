import { Queue, Function, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

/**
 * Initializes project queues for Jira integration.
 * @param stack - The AWS CloudFormation stack.
 * @param jiraDDB - The DynamoDB table for Jira.
 * @returns An array of project queues.
 * @throws Error if any of the queues fail to bind.
 */
export function initializeWorklogQueue(
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

  const worklogFormatDataQueue = new Queue(stack, 'qWorklogFormat', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qWorklogFormat'),
      },
    },
  });
  worklogFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnWorklogFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/worklog.handler',
      bind: [worklogFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  worklogFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    jiraIndexDataQueue,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    IGNORED_PROJECT_KEYS,
    REQUEST_TIMEOUT,
  ]);

  return worklogFormatDataQueue;
}
