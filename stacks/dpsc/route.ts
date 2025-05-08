/* eslint-disable max-lines-per-function */
import { ApiRouteProps } from 'sst/constructs';

export function initializeRoutes(): Record<string, ApiRouteProps<'universal'>> {
  return {
    // GET PR comments graph data
    'GET /github/graph/number-comments-added-to-prs': {
      function: 'packages/github/src/service/get-pr-comment.handler',
      authorizer: 'universal',
    },

    // GET PR comments graph data detail view
    'GET /github/graph/number-comments-added-to-prs/details': {
      function: 'packages/github/src/service/get-pr-comment-detail.handler',
      authorizer: 'universal',
    },

    // GET Graph for frequency of code commits
    'GET /github/graph/code-commit-frequency': {
      function: 'packages/github/src/service/get-commit-frequency.handler',
      authorizer: 'universal',
    },
    // GET Graph for number of PRs
    'GET /github/graph/number-pr-raised': {
      function: 'packages/github/src/service/pr-raised-count.handler',
      authorizer: 'universal',
    },

    // GET Graph for PRs review time
    'GET /github/graph/pr-wait-time': {
      function: 'packages/github/src/service/pr-wait-time.handler',
      authorizer: 'universal',
    },

    // GET github active number of branches
    'GET /github/graph/number-of-branches': {
      function: 'packages/github/src/service/active-branches.handler',
      authorizer: 'universal',
    },

    'GET /github/graph/number-of-branches-by-repo': {
      function: 'packages/github/src/cron/branch-counter.handler',
    },

    // GET Graph for avg lines of code per day per developer
    'GET /github/graph/lines-of-code': {
      function: 'packages/github/src/service/get-lines-of-code.handler',
      authorizer: 'universal',
    },

    // TODO: Move again in github stack after UAT and PROD will be sync   GET GithubUser data
    'GET /github/user/{githubUserId}': {
      function: 'packages/github/src/service/get-user.handler',
      authorizer: 'universal',
    },

    // TODO: Move again in github stack after UAT and PROD will be sync  GET GithubRepo data
    'GET /github/repositories': {
      function: 'packages/github/src/service/get-repo.handler',
      authorizer: 'universal',
    },

    'GET /dsc/rags': {
      function: {
        handler: 'packages/github/src/service/dsc-rags.handler',
      },
      authorizer: 'none',
    },

    'GET /tsc/rags': {
      function: {
        handler: 'packages/github/src/service/tsc-rags.handler',
      },
      authorizer: 'none',
    },

    'GET /github/graph/pr-wait-time/details': {
      function: {
        handler: 'packages/github/src/service/pr-wait-time-details.handler',
      },
      authorizer: 'none',
    },

    'GET /github/organisations': {
      function: {
        handler: 'packages/github/src/service/get-organisations.handler',
      },
      authorizer: 'universal',
    },

    // GET Github Branches data
    'GET /github/branches': {
      function: 'packages/github/src/service/get-branches.handler',
      authorizer: 'universal',
    },

    'GET /github/tech-audit': {
      function: {
        handler: 'packages/github/src/service/tech-audit.handler',
        timeout: '5 minutes',
      },
      authorizer: 'universal',
    },

    'GET /github/deployment-frequency/graph': {
      function: {
        handler: 'packages/github/src/service/deployment-frequency-graph.handler',
      },
      authorizer: 'universal',
    },

    'GET /github/deployment-frequency/details': {
      function: {
        handler: 'packages/github/src/service/deployment-frequency-details.handler',
      },
      authorizer: 'universal',
    },

    'GET /github/deployment-frequency/table': {
      function: {
        handler: 'packages/github/src/service/get-deployment-frequency-table.handler',
      },
      authorizer: 'universal',
    },

    'GET /github/active-branches/details': {
      function: {
        handler: 'packages/github/src/service/get-active-branches-details.handler',
      },
      authorizer: 'universal',
    },
  };
}
