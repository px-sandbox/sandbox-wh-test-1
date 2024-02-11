import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(
): Record<string, ApiRouteProps<'universal'>> {
  return {

    // GET PR comments graph data
    'GET /jira/sprint/variance': {
      function: 'packages/jira/src/service/sprint-variance.handler',
      authorizer: 'universal',
    }
  }
}