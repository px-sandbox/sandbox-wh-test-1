import { Queue, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

export function initializeIssueQueue(stack: Stack, jiraDDB: Table): Queue[] {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);

  const issueMigrateQueue = new Queue(stack, 'jira_issue_migrate', {
    consumer: {
      function: 'packages/jira/src/migrations/issue.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const issueIndexDataQueue = new Queue(stack, 'jira_issue_index', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer/user.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const issueFormatDataQueue = new Queue(stack, 'jira_issue_format', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/formatter/user.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  issueMigrateQueue.bind([
    jiraDDB,
    issueFormatDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  issueFormatDataQueue.bind([jiraDDB, issueIndexDataQueue]);

  issueIndexDataQueue.bind([jiraDDB, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  return [issueMigrateQueue, issueFormatDataQueue, issueIndexDataQueue];
}
