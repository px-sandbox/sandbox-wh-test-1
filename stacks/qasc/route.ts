/* eslint-disable max-lines-per-function */
import { ApiRouteProps, use } from 'sst/constructs';
import { commonConfig } from '../common/config';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  const { NO_INTERNAL_DEFECT } = use(commonConfig);
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
        bind: [NO_INTERNAL_DEFECT],
      },
      authorizer: 'universal',
    },
    'GET /jira/rca/details': {
      function: {
        handler: 'packages/jira/src/service/rca-details.handler',
        bind: [NO_INTERNAL_DEFECT],
      },
      authorizer: 'universal',
    },
    'GET /jira/rca/trends': {
      function: {
        handler: 'packages/jira/src/service/rca-trends.handler',
        bind: [NO_INTERNAL_DEFECT],
      },
      authorizer: 'universal',
    },
    'GET /jira/rca/graph': {
      function: {
        handler: 'packages/jira/src/service/rca-graph.handler',
        bind: [NO_INTERNAL_DEFECT],
      },
      authorizer: 'universal',
    },
  };
}
