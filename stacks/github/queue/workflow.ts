import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';

// initailize 4 queues for the workflow
export function createGhWorkflowQueue(stack: Stack): Queue[] {
  const {
    GIT_ORGANIZATION_ID,
    REQUEST_TIMEOUT,
    NODE_VERSION,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
  } = use(commonConfig);
  const pulseVersionUpgradesReportQueue = new Queue(stack, 'qRepoLibS3V2');
  const pulseSecurityErrorsReportQueue = new Queue(stack, 'qGhRepoSastErrorV2');
  const pulseTestCaseCoverageReportQueue = new Queue(stack, 'qGhTestCoverageV2');
  const pulseWorkBreakdownReportQueue = new Queue(stack, 'qGhWorkbreakdownV2');

  pulseVersionUpgradesReportQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhVersionUpgradesReportV2', {
      handler: 'packages/github/src/sqs/handlers/formatter/gh-test-coverage.handler',
      runtime: NODE_VERSION,
      bind: [
        pulseVersionUpgradesReportQueue,
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        REQUEST_TIMEOUT,
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });
  pulseSecurityErrorsReportQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhSecurityErrorsReportV2', {
      handler: 'packages/github/src/sqs/handlers/formatter/gh-test-coverage.handler',
      runtime: NODE_VERSION,
      bind: [
        pulseSecurityErrorsReportQueue,
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        REQUEST_TIMEOUT,
      ],
    }),
  });
  pulseTestCaseCoverageReportQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhTestCaseCoverageReportV2', {
      handler: 'packages/github/src/sqs/handlers/formatter/gh-test-coverage.handler',
      runtime: NODE_VERSION,
      bind: [
        pulseTestCaseCoverageReportQueue,
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        REQUEST_TIMEOUT,
      ],
    }),
  });
  pulseWorkBreakdownReportQueue.addConsumer(stack, {
    function: new Function(stack, 'fnGhWorkBreakdownReportV2', {
      handler: 'packages/github/src/sqs/handlers/formatter/gh-test-coverage.handler',
      runtime: NODE_VERSION,
      bind: [
        pulseWorkBreakdownReportQueue,
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        REQUEST_TIMEOUT,
      ],
    }),
  });

  return [
    pulseVersionUpgradesReportQueue,
    pulseSecurityErrorsReportQueue,
    pulseTestCaseCoverageReportQueue,
    pulseWorkBreakdownReportQueue,
  ];
}
