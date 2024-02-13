import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

/* eslint-disable max-lines-per-function */
export function initializeIssueQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS,
    NODE_VERSION,
  } = use(commonConfig);

  const issueIndexDataQueue = new Queue(stack, 'qIssueIndex', {
    consumer: {
      function: {
        handler: 'packages/jira/src/sqs/handlers/indexer/issue.handler',
        runtime: NODE_VERSION,
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
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const reOpenRateDataQueue = new Queue(stack, 'qReOpenRate');
  reOpenRateDataQueue.addConsumer(stack, {
    function: new Function(stack, 'fnReOpenRate', {
      handler: 'packages/jira/src/sqs/handlers/formatter/reopen-rate.handler',
      bind: [reOpenRateDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const reOpenRateIndexQueue = new Queue(stack, 'qReOpenRateIndex');
  reOpenRateIndexQueue.addConsumer(stack, {
    function: new Function(stack, 'fnReOpenRateIndex', {
      handler: 'packages/jira/src/sqs/handlers/indexer/reopen-rate.handler',
      bind: [reOpenRateIndexQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const reOpenRateMigratorQueue = new Queue(stack, 'qReOpenRateMigrator');
  reOpenRateMigratorQueue.addConsumer(stack, {
    function: new Function(stack, 'fnReOpenRateMigrator', {
      handler: 'packages/jira/src/sqs/handlers/formatter/reopen-rate-migrator.handler',
      bind: [reOpenRateMigratorQueue, reOpenRateIndexQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const reOpenRateDeleteQueue = new Queue(stack, 'qReOpenRateDelete');
  reOpenRateDeleteQueue.addConsumer(stack, {
    function: new Function(stack, 'fnReOpenRateDelete', {
      handler: 'packages/jira/src/sqs/handlers/reopen-rate-delete.handler',
      bind: [reOpenRateDeleteQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const issueTimeTrackingMigrationQueue = new Queue(stack, 'qIssueTimeTrackingMigration');
  issueTimeTrackingMigrationQueue.addConsumer(stack, {
    function: new Function(stack, 'qIssueTimeTrackingMigration', {
      handler: 'packages/jira/src/sqs/handlers/migration/issue-time-tracking.handler',
      bind: [issueTimeTrackingMigrationQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 10,
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
    AVAILABLE_PROJECT_KEYS,
  ]);
  issueIndexDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  reOpenRateDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.processJiraRetryTable,
    jiraDDB.jiraMappingTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    reOpenRateIndexQueue,
    AVAILABLE_PROJECT_KEYS,
  ]);

  reOpenRateIndexQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  reOpenRateMigratorQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  reOpenRateDeleteQueue.bind([
    jiraDDB.processJiraRetryTable,
    jiraDDB.jiraMappingTable,
    reOpenRateIndexQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  issueTimeTrackingMigrationQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
  ]);

  return [
    issueFormatDataQueue,
    issueIndexDataQueue,
    reOpenRateDataQueue,
    reOpenRateIndexQueue,
    reOpenRateMigratorQueue,
    reOpenRateDeleteQueue,
    issueTimeTrackingMigrationQueue,
  ];
}
