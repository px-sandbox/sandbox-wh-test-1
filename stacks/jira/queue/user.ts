import { Function, Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

export function initializeUserQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  } = use(commonConfig);

  // const userMigrateQueue = new Queue(stack, 'jira_user_migrate', {
  //   consumer: {
  //     function: 'packages/jira/src/migrations/user.handler',
  //     cdk: {
  //       eventSource: {
  //         batchSize: 5,
  //       },
  //     },
  //   },
  // });

  const userIndexDataQueue = new Queue(stack, 'jira_users_index', {
    consumer: {
      function: 'packages/jira/src/sqs/handlers/indexer/user.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const userFormatDataQueue = new Queue(stack, 'jira_users_format');
  userFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_users_format_func', {
      handler: 'packages/jira/src/sqs/handlers/formatter/user.handler',
      bind: [userFormatDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  // userMigrateQueue.bind([
  //   jiraDDB,
  //   userFormatDataQueue,
  //   OPENSEARCH_NODE,
  //   OPENSEARCH_PASSWORD,
  //   OPENSEARCH_USERNAME,
  // ]);

  userFormatDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    userIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
  ]);
  userIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  return [userFormatDataQueue, userIndexDataQueue];
}
