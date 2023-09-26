import { Stack } from 'aws-cdk-lib';
import { Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

export function initializeSprintQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  } = use(commonConfig);

  const sprintMigrateQueue = new Queue(stack, 'jira_sprint_migrate', {
    consumer: {
      function: 'packages/jira/src/migrations/sprint.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const sprintFormatDataQueue = new Queue(stack, 'jira_sprint_format', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/formatter/sprint.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const sprintIndexDataQueue = new Queue(stack, 'jira_sprint_index', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/indexer/sprint.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  sprintMigrateQueue.bind([
    jiraDDB.jiraMappingTable,
    sprintFormatDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  sprintFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    sprintIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
  ]);
  sprintIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  return [sprintMigrateQueue, sprintFormatDataQueue, sprintIndexDataQueue];
}
