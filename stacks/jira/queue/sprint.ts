import { Queue, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

export function initializeSprintQueue(stack: Stack, jiraDDB: Table): Queue[] {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);

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
    jiraDDB,
    sprintFormatDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  sprintFormatDataQueue.bind([
    jiraDDB,
    sprintIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  sprintIndexDataQueue.bind([jiraDDB, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  return [sprintMigrateQueue, sprintFormatDataQueue, sprintIndexDataQueue];
}
