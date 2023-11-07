import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

export function initializeIssueQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS
  } = use(commonConfig);

  const issueIndexDataQueue = new Queue(stack, 'qIssueIndex', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/indexer/issue.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const issueFormatDataQueue = new Queue(stack, 'qIssueFormat');
  issueFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnIssueFormat', {
      handler: 'packages/jira/src/sqs/handlers/formatter/issue.handler',
      bind: [issueFormatDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });


  issueFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    issueIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS
  ]);
  issueIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    AVAILABLE_PROJECT_KEYS
  ]);

  return [issueFormatDataQueue, issueIndexDataQueue];
}
