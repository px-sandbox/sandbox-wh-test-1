/* eslint-disable @typescript-eslint/ban-types */
import { Stack } from 'aws-cdk-lib';
import { Api, Function, use } from 'sst/constructs';
import { initializeRoutes } from './route';
import { commonConfig } from '../common/config';

export function initializeApi(stack: Stack): Api<{
  universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
}> {
  const {
    AUTH_PUBLIC_KEY,
    // JIRA_CLIENT_ID,
    // JIRA_CLIENT_SECRET,
    // JIRA_REDIRECT_URI,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    REQUEST_TIMEOUT,
    // IGNORED_PROJECT_KEYS,
    // PROJECT_DELETION_AGE,
    NODE_VERSION,
  } = use(commonConfig);
  const pmAPI = new Api(stack, 'pmAPI', {
    authorizers: {
      universal: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'fnPmUniversalAuth', {
          handler: 'packages/auth/src/auth.handler',
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
          OPENSEARCH_NODE,
          OPENSEARCH_PASSWORD,
          OPENSEARCH_USERNAME,
          REQUEST_TIMEOUT,
          // JIRA_CLIENT_ID,
          // JIRA_CLIENT_SECRET,
          // JIRA_REDIRECT_URI,
          // IGNORED_PROJECT_KEYS,
          // PROJECT_DELETION_AGE,
        ],
        runtime: NODE_VERSION,
      },
    },
    routes: initializeRoutes(),
  });

  return pmAPI;
}
