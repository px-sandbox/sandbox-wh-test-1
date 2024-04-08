import { Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

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
  });

  jiraIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    REQUEST_TIMEOUT,
  ]);
  return jiraIndexDataQueue;
}
