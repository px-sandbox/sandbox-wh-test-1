import { Queue, Function, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

/**
 * Initializes project queues for Jira integration.
 * @param stack - The AWS CloudFormation stack.
 * @param jiraDDB - The DynamoDB table for Jira.
 * @returns An array of project queues.
 * @throws Error if any of the queues fail to bind.
 */
export function initializeProjectQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  } = use(commonConfig);

  // const projectMigrateQueue = new Queue(stack, 'jira_project_migrate', {
  //   consumer: {
  //     function: 'packages/jira/src/migrations/project.handler',
  //     cdk: {
  //       eventSource: {
  //         batchSize: 5,
  //       },
  //     },
  //   },
  // });

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

  const projectFormatDataQueue = new Queue(stack, 'jira_projects_format');
  projectFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_projects_format_func', {
      handler: 'packages/jira/src/sqs/handlers/formatter/project.handler',
      bind: [projectFormatDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  // projectMigrateQueue.bind([
  //   jiraDDB,
  //   projectFormatDataQueue,
  //   OPENSEARCH_NODE,
  //   OPENSEARCH_PASSWORD,
  //   OPENSEARCH_USERNAME,
  // ]);

  projectFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    projectIndexDataQueue,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  ]);

  projectIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  return [projectFormatDataQueue, projectIndexDataQueue];
}
