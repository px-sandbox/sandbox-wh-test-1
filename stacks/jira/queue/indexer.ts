import { Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

export function initializeIndexQueue(stack: Stack, jiraDDB: JiraTables): Queue {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, REQUEST_TIMEOUT } =
    use(commonConfig);
  const jiraIndexDataQueue = new Queue(stack, 'qJiraIndex', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
    cdk: {
      queue: {
        deadLetterQueue: getDeadLetterQ(stack, 'qJiraIndex'),
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
