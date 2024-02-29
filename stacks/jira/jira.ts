import { Api, Function, StackContext } from 'sst/constructs';
import { initializeQueues } from './queue/initialize';
import { initializeDynamoDBTables } from './ddb-tables';
import { intializeJiraCron } from './cron-jobs';
import { initializeFunctions } from './cron-functions';
import { initializeApi } from './api';

// eslint-disable-next-line max-lines-per-function,
export function jira({ stack }: StackContext): {
  jiraApi: Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {
  const { jiraMappingTable, jiraCredsTable, processJiraRetryTable } =
    initializeDynamoDBTables(stack);

  const {
    projectMigrateQueue,
    userMigrateQueue,
    sprintMigrateQueue,
    issueStatusMigrateQueue,
    issueMigrateQueue,
    issueTimeTrackingMigrationQueue,
    ...restQueues
  } = initializeQueues(stack, jiraMappingTable, jiraCredsTable, processJiraRetryTable);

  const [refreshToken, processJiraRetryFunction, hardDeleteProjectsData] = initializeFunctions(
    stack,
    Object.values(restQueues),
    { jiraMappingTable, jiraCredsTable, processJiraRetryTable }
  );

  const jiraApi = initializeApi(
    stack,
    { jiraMappingTable, jiraCredsTable, processJiraRetryTable },
    [
      projectMigrateQueue,
      userMigrateQueue,
      sprintMigrateQueue,
      issueStatusMigrateQueue,
      issueMigrateQueue,
      issueTimeTrackingMigrationQueue,
      ...Object.values(restQueues),
    ]
  );
  // Initialize Cron for Jira
  intializeJiraCron(stack, processJiraRetryFunction, refreshToken, hardDeleteProjectsData);

  stack.addOutputs({
    ApiEndpoint: jiraApi.url,
  });
  return { jiraApi };
}
