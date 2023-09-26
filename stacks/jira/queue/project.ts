import { Queue, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

/**
 * Initializes project queues for Jira integration.
 * @param stack - The AWS CloudFormation stack.
 * @param jiraDDB - The DynamoDB table for Jira.
 * @returns An array of project queues.
 */
export function initializeProjectQueue(stack: Stack, jiraDDB: Table): Queue[] {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);

  const projectMigrateQueue = new Queue(stack, 'jira_project_migrate', {
    consumer: {
      function: 'packages/jira/src/migrations/project.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const projectIndexDataQueue = new Queue(stack, 'jira_projects_index', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer/project.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const projectFormatDataQueue = new Queue(stack, 'jira_projects_format', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/formatter/project.handler',
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  projectMigrateQueue.bind([
    jiraDDB,
    projectFormatDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  projectFormatDataQueue.bind([jiraDDB, projectIndexDataQueue]);

  projectIndexDataQueue.bind([jiraDDB, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  return [projectMigrateQueue, projectFormatDataQueue, projectIndexDataQueue];
}
