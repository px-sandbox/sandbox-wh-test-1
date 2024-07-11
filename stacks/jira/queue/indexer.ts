import { Function, Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeIndexQueue(stack: Stack, jiraDDB: JiraTables): Queue {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, REQUEST_TIMEOUT } =
    use(commonConfig);

  const jiraIndexDataQueue = new Queue(stack, 'qJiraIndex', {
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qJiraIndex'),
      },
    },
  });

  jiraIndexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnJiraIndex', {
      handler: 'packages/jira/src/sqs/handlers/indexer.handler',
      bind: [jiraIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  jiraIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    REQUEST_TIMEOUT,
  ]);

  return jiraIndexDataQueue;
}
