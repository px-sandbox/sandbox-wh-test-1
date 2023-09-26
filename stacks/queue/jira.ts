import { Queue, Table, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../common/config';
import { JiraTables } from '../type/tables';

export function initializeJiraQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
  } = use(commonConfig);
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
  userFormatDataQueue.bind([jiraDDB.jiraMappingTable, userIndexDataQueue]);

  userIndexDataQueue.bind([
    jiraDDB.jiraMappingTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

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

  return [userFormatDataQueue, sprintFormatDataQueue];
}
