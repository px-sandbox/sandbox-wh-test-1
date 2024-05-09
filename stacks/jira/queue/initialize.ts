import { Stack } from 'aws-cdk-lib';
import { Table, Queue } from 'sst/constructs';
import { initializeSprintQueue } from './sprint';
import { initializeProjectQueue } from './project';
import { initializeUserQueue } from './user';
import { initializeBoardQueue } from './board';
import { initializeIssueQueue } from './issue';
import { initializeIssueStatusQueue } from './issue-status';
import { initializeMigrateQueue } from './migrate';
import { initializeIndexQueue } from './indexer';

// eslint-disable-next-line max-lines-per-function
export function initializeQueues(
  stack: Stack,
  jiraMappingTable: Table,
  jiraCredsTable: Table,
  retryProcessTable: Table
): Record<string, Queue> {
  const jiraDDB = {
    jiraMappingTable,
    jiraCredsTable,
    retryProcessTable,
  };
  const jiraIndexer = initializeIndexQueue(stack, jiraDDB);
  const sprintFormatter = initializeSprintQueue(stack, jiraDDB, jiraIndexer);
  const projectFormatter = initializeProjectQueue(stack, jiraDDB, jiraIndexer);
  const userFormatter = initializeUserQueue(stack, jiraDDB, jiraIndexer);
  const boardFormatter = initializeBoardQueue(stack, jiraDDB, jiraIndexer);
  const [
    issueFormatter,
    reOpenRateDataQueue,
    reOpenRateMigratorQueue,
    reOpenRateDeleteQueue,
    issueTimeTrackingMigrationQueue,
  ] = initializeIssueQueue(stack, jiraDDB, jiraIndexer);

  const issueStatusFormatter = initializeIssueStatusQueue(stack, jiraDDB, jiraIndexer);

  const [
    projectMigrateQueue,
    userMigrateQueue,
    sprintMigrateQueue,
    issueStatusMigrateQueue,
    issueMigrateQueue,
  ] = initializeMigrateQueue(stack, jiraDDB, [
    projectFormatter,
    sprintFormatter,
    userFormatter,
    boardFormatter,
    issueFormatter,
    issueStatusFormatter,
  ]);

  return {
    projectMigrateQueue,
    userMigrateQueue,
    sprintMigrateQueue,
    issueStatusMigrateQueue,
    issueMigrateQueue,
    sprintFormatter,
    projectFormatter,
    userFormatter,
    boardFormatter,
    issueFormatter,
    issueStatusFormatter,
    reOpenRateDataQueue,
    reOpenRateMigratorQueue,
    reOpenRateDeleteQueue,
    issueTimeTrackingMigrationQueue,
    jiraIndexer,
  };
}
