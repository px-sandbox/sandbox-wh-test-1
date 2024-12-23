/* eslint-disable max-lines-per-function */
import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  return {
    'GET /jira/graph/cycle-time/overall': {
      function: {
        handler: 'packages/jira/src/service/cycle-time/overall.handler',
        timeout: '10 seconds',
      },
      authorizer: 'universal',
    },
    'GET /jira/cycle-time/graph-and-table/summary': {
      function: {
        handler: 'packages/jira/src/service/cycle-time/summary.handler',
        timeout: '10 seconds',
      },
      authorizer: 'universal',
    },
    'GET /jira/graph/cycle-time/detailed': {
      function: {
        handler: 'packages/jira/src/service/cycle-time/detailed.handler',
        timeout: '10 seconds',
      },
      authorizer: 'universal',
    },
  };
}
