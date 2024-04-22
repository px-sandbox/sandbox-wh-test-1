/* eslint-disable max-lines-per-function */
import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../common/config';
import { GithubTables } from '../type/tables';

export function initializeFunctions(
  stack: Stack,
  queuesForFunctions: { [key: string]: Queue },
  githubDDb: GithubTables
): Record<string, Function> {
  // eslint-disable-line @typescript-eslint/ban-types
  const {
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
    REQUEST_TIMEOUT,
  } = use(commonConfig);

  const { ghCopilotFormatDataQueue, branchCounterFormatterQueue, masterLibraryQueue } =
    queuesForFunctions;

  const ghCopilotFunction = new Function(stack, 'fnGithubCopilot', {
    handler: 'packages/github/src/cron/github-copilot.handler',
    bind: [
      ghCopilotFormatDataQueue,
      GITHUB_APP_PRIVATE_KEY_PEM,
      GITHUB_APP_ID,
      GITHUB_SG_INSTALLATION_ID,
      REQUEST_TIMEOUT,
    ],
    runtime: NODE_VERSION,
  });

  const ghBranchCounterFunction = new Function(stack, 'fnBranchCounter', {
    handler: 'packages/github/src/cron/branch-counter.handler',
    bind: [
      OPENSEARCH_NODE,
      OPENSEARCH_PASSWORD,
      OPENSEARCH_USERNAME,
      REQUEST_TIMEOUT,
      branchCounterFormatterQueue,
    ],
    runtime: NODE_VERSION,
  });

  const ghUpdateLatestDepOnDDBFunction = new Function(stack, 'fnUpdateLatestDepOnDDB', {
    handler: 'packages/github/src/cron/update-latest-dep.handler',
    timeout: '300 seconds',
    bind: [githubDDb.libMasterTable, masterLibraryQueue],
    runtime: NODE_VERSION,
  });

  return {
    ghCopilotFunction,
    ghBranchCounterFunction,
    ghUpdateLatestDepOnDDBFunction,
  };
}
