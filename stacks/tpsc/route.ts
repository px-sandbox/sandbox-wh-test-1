/* eslint-disable max-lines-per-function */
import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  return {
    'GET /github/test-coverage/graph': {
      function: {
        handler: 'packages/github/src/service/get-test-coverage-graph.handler',
      },
      authorizer: 'universal',
    },

    'GET /github/test-coverage/tabular': {
      function: {
        handler: 'packages/github/src/service/get-test-coverage.handler',
      },
      authorizer: 'universal',
    },

    'GET /github/test-coverage-headline': {
      function: {
        handler: 'packages/github/src/service/get-test-coverage-headline.handler',
      },
      authorizer: 'universal',
    },
    // techincal metrics api's
    'GET /github/graph/product-security': {
      function: {
        handler: 'packages/github/src/service/product-security.handler',
      },
      authorizer: 'universal',
    },

    'GET /github/graph/product-security/detail': {
      function: {
        handler: 'packages/github/src/service/repo-sast-errors-details.handler',
      },
      authorizer: 'universal',
    },
  };
}
