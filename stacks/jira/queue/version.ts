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
export function initializeVersionQueue(
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

  const versionFormatDataQueue = new Queue(stack, 'qVersionFormat', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qVersionFormat'),
      },
    },
  });
  versionFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnVersionFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/version.handler',
      bind: [versionFormatDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  versionFormatDataQueue.bind([
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

  return versionFormatDataQueue;
}
