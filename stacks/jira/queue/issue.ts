import { Stack } from 'aws-cdk-lib';
import { Queue, use } from 'sst/constructs';
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
  } = use(commonConfig);

  // const issueMigrateQueue = new Queue(stack, 'jira_issue_migrate', {
  //   consumer: {
  //     function: 'packages/jira/src/migrations/issue.handler',
  //     cdk: {
  //       eventSource: {
  //         batchSize: 5,
  //       },
  //     },
  //   },
  // });

  const issueFormatDataQueue = new Queue(stack, 'jira_issue_format', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/formatter/issue.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const issueIndexDataQueue = new Queue(stack, 'jira_issue_index', {
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

  // issueMigrateQueue.bind([
  //   jiraDDB.jiraMappingTable,
  //   issueFormatDataQueue,
  //   OPENSEARCH_NODE,
  //   OPENSEARCH_PASSWORD,
  //   OPENSEARCH_USERNAME,
  // ]);

  issueFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    issueIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  ]);
  issueIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  return [issueFormatDataQueue, issueIndexDataQueue];
}
