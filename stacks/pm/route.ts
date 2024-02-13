import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  return {
    // GET sprint variance data
    'GET /jira/sprint/variance': {
      function: 'packages/jira/src/service/sprint-variance.handler',
      authorizer: 'universal',
    },

    // GET estimates vs actuals breakdown
    'GET /jira/{projectId}/{sprintId}/metrics/pm/estimates-vs-actuals': {
      function: {
        handler: 'packages/jira/src/service/issue/estimates-vs-actuals-breakdown.handler',
      },
      authorizer: 'universal',
    },
  };
}
