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
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
  } = use(commonConfig);
  const tpscAPI = new Api(stack, 'tpscAPI', {
    authorizers: {
      universal: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'universalTpscAuth', {
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
        bind: [OPENSEARCH_NODE, REQUEST_TIMEOUT, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME],
        runtime: NODE_VERSION,
      },
    },
    routes: initializeRoutes(),
  });

  return tpscAPI;
}
