import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';
import { initializeDeadLetterQueue } from '../../common/dead-letter-queue';

/* eslint-disable max-lines-per-function */
export function initializeIssueQueue(
  stack: Stack,
  jiraDDB: JiraTables,
  jiraIndexDataQueue: Queue
): Queue[] {
  const {
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);

  const issueFormatDataQueue = new Queue(stack, 'qIssueFormat', {
    cdk: {
      queue: {
        fifo: true,
        deadLetterQueue: initializeDeadLetterQueue(stack, 'qIssueFormat', true),
      },
    },
  });
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

  const reOpenRateDataQueue = new Queue(stack, 'qReOpenRate', {
    cdk: {
      queue: {
        deadLetterQueue: initializeDeadLetterQueue(stack, 'qReOpenRate', false),
      },
    },
  });
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

  const reOpenRateMigratorQueue = new Queue(stack, 'qReOpenRateMigrator', {
    cdk: {
      queue: {
        deadLetterQueue: initializeDeadLetterQueue(stack, 'qReOpenRateMigrator', false),
      },
    },
  });
  reOpenRateMigratorQueue.addConsumer(stack, {
    function: new Function(stack, 'fnReOpenRateMigrator', {
      handler: 'packages/jira/src/sqs/handlers/formatter/reopen-rate-migrator.handler',
      bind: [reOpenRateMigratorQueue, jiraIndexDataQueue],
      runtime: NODE_VERSION,
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const reOpenRateDeleteQueue = new Queue(stack, 'qReOpenRateDelete', {
    cdk: {
      queue: {
        deadLetterQueue: initializeDeadLetterQueue(stack, 'qReOpenRateDelete', false),
      },
    },
  });
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

  const issueTimeTrackingMigrationQueue = new Queue(stack, 'qIssueTimeTrackingMigration', {
    cdk: {
      queue: {
        deadLetterQueue: initializeDeadLetterQueue(stack, 'qIssueTimeTrackingMigration', false),
      },
    },
  });
  issueTimeTrackingMigrationQueue.addConsumer(stack, {
    function: new Function(stack, 'fnIssueTimeTrackingMigration', {
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
    jiraIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    AVAILABLE_PROJECT_KEYS,
    REQUEST_TIMEOUT,
  ]);

  reOpenRateDataQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.processJiraRetryTable,
    jiraDDB.jiraMappingTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    jiraIndexDataQueue,
    AVAILABLE_PROJECT_KEYS,
    REQUEST_TIMEOUT,
  ]);

  reOpenRateMigratorQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    REQUEST_TIMEOUT,
  ]);

  reOpenRateDeleteQueue.bind([
    jiraDDB.processJiraRetryTable,
    jiraDDB.jiraMappingTable,
    jiraIndexDataQueue,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    REQUEST_TIMEOUT,
  ]);

  issueTimeTrackingMigrationQueue.bind([
    jiraDDB.jiraCredsTable,
    jiraDDB.jiraMappingTable,
    jiraDDB.processJiraRetryTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_REDIRECT_URI,
    jiraIndexDataQueue,
    REQUEST_TIMEOUT,
  ]);

  return [
    issueFormatDataQueue,
    reOpenRateDataQueue,
    reOpenRateMigratorQueue,
    reOpenRateDeleteQueue,
    issueTimeTrackingMigrationQueue,
  ];
}
