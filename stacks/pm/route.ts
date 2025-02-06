import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  return {
    // GET sprint variance data
    'GET /jira/graph/estimates-vs-actuals': {
      function: 'packages/jira/src/service/sprint-variance.handler',
      authorizer: 'universal',
    },

    // GET estimates vs actuals breakdown
    'GET /jira/graph/estimates-vs-actuals/details': {
      function: {
        handler: 'packages/jira/src/service/issue/estimates-vs-actuals-breakdown.handler',
        timeout: '5 minutes',
      },
      authorizer: 'universal',
    },

    'GET /jira/time-spent/headlines': {
      function: 'packages/jira/src/service/time-spent-headline.handler',
      authorizer: 'universal',
    },

    'GET /jira/time-spent/table': { 
      function: 'packages/jira/src/service/time-spent-table.handler',
      authorizer: 'universal',
    },

  };
}
