/* eslint-disable max-lines-per-function */
import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  return {
    'GET /jira/graph/first-time-pass-rate': {
      function: 'packages/jira/src/service/ftp-rate.handler',
      authorizer: 'universal',
    },
    'GET /jira/graph/reopen-rate': {
      function: 'packages/jira/src/service/reopen-rate.handler',
      authorizer: 'universal',
    },
    'GET /jira/rca/table': {
      function: {
        handler: 'packages/jira/src/service/rca-table.handler',
      },
      authorizer: 'universal',
    },
    'GET /jira/rca/details': {
      function: {
        handler: 'packages/jira/src/service/rca-details.handler',
      },
      authorizer: 'universal',
    },
    'GET /jira/rca/trends': {
      function: {
        handler: 'packages/jira/src/service/rca-trends.handler',
      },
      authorizer: 'universal',
    },
    'GET /jira/rca/graph': {
      function: {
        handler: 'packages/jira/src/service/rca-graph.handler',
      },
      authorizer: 'universal',
    },
  };
}
