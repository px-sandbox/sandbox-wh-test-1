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

  const [
    projectMigrateQueue,
    sprintMigrateQueue,
    issueMigrateQueue,
    userMigrateQueue,
    ...restQueues
  ] = initializeQueues(
    stack,
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable
  );

  const [refreshToken, processJiraRetryFunction] = initializeFunctions(
    stack,
    restQueues,
    { jiraMappingTable, jiraCredsTable, processJiraRetryTable }
  );

  const jiraApi = initializeApi(
    stack,
    { jiraMappingTable, jiraCredsTable, processJiraRetryTable },
    [
      projectMigrateQueue,
      userMigrateQueue,
      sprintMigrateQueue,
      issueMigrateQueue,
      ...restQueues
    ]
  );
  // Initialize Cron for Jira
  intializeJiraCron(stack, processJiraRetryFunction, refreshToken);

  stack.addOutputs({
    ApiEndpoint: jiraApi.url,
  });
  return { jiraApi };
}
