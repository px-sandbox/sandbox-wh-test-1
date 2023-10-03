import { Queue, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';

export function initializeUserQueue(stack: Stack, jiraDDB: Table): Queue[] {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);

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

  const userFormatDataQueue = new Queue(stack, 'jira_users_format', {
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

  // userMigrateQueue.bind([
  //   jiraDDB,
  //   userFormatDataQueue,
  //   OPENSEARCH_NODE,
  //   OPENSEARCH_PASSWORD,
  //   OPENSEARCH_USERNAME,
  // ]);

  userFormatDataQueue.bind([jiraDDB, userIndexDataQueue]);
  userIndexDataQueue.bind([jiraDDB, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  return [userFormatDataQueue, userIndexDataQueue];
}
