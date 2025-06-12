import { Stack } from 'aws-cdk-lib';
import { Api, Bucket, Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../common/config';
import { GithubTables } from '../type/tables';
import { initializeRoutes } from './route';

// eslint-disable-next-line max-lines-per-function,
export function initializeApi(
  stack: Stack,
  queue: { [key: string]: Queue },
  githubDDb: GithubTables,
  buckets: { [key: string]: Bucket }
): Api<{
  // eslint-disable-next-line @typescript-eslint/ban-types
  universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  // eslint-disable-next-line @typescript-eslint/ban-types
  admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
}> {
  const {
    AUTH_PUBLIC_KEY,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_BASE_URL,
    GITHUB_SG_ACCESS_TOKEN,
    GITHUB_SG_INSTALLATION_ID,
    GITHUB_WEBHOOK_SECRET,
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
  } = use(commonConfig);
  const ghAPI = new Api(stack, 'api', {
    authorizers: {
      universal: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'fnUniversalAuth', {
          handler: 'packages/auth/src/auth.handler',
          bind: [AUTH_PUBLIC_KEY],
          runtime: NODE_VERSION,
        }),
      },
      admin: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'fnAdminAuth', {
          handler: 'packages/auth/src/admin-auth.handler',
          bind: [AUTH_PUBLIC_KEY],
          runtime: NODE_VERSION,
        }),
      },
    },
    defaults: {
      authorizer: 'universal',
      function: {
        timeout: '30 seconds',
        bind: [
          GITHUB_APP_ID,
          GITHUB_APP_PRIVATE_KEY_PEM,
          GITHUB_BASE_URL,
          GITHUB_SG_ACCESS_TOKEN,
          GITHUB_SG_INSTALLATION_ID,
          GITHUB_WEBHOOK_SECRET,
          GIT_ORGANIZATION_ID,
          OPENSEARCH_NODE,
          REQUEST_TIMEOUT,
          OPENSEARCH_PASSWORD,
          OPENSEARCH_USERNAME,
          buckets.sastErrorsBucket,
          buckets.versionUpgradeBucket,
          buckets.testCoverageReportsBucket,
        ],
        runtime: NODE_VERSION,
      },
    },
    routes: initializeRoutes(queue, githubDDb),
  });

  return ghAPI;
}
