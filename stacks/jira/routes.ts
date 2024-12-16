import { Queue, Table, use, ApiRouteProps } from 'sst/constructs';
import { commonConfig } from '../common/config';

// eslint-disable-next-line max-lines-per-function,
export function initializeRoutes(
  migrateQueues: Record<string, Queue>,
  jiraCredsTable: Table
): Record<string, ApiRouteProps<'universal' | 'admin'>> {
  const { JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, JIRA_REDIRECT_URI } = use(commonConfig);
  let routesObj: Record<string, ApiRouteProps<'universal' | 'admin'>> = {};
  const {
    projectMigrateQueue,
    userMigrateQueue,
    sprintMigrateQueue,
    issueStatusMigrateQueue,
    issueMigrateQueue,
    issueTimeTrackingMigrationQueue,
  } = migrateQueues;
  routesObj = {
    // GET create all Jira indices into ES
    'GET /jira/create-indices': {
      function: 'packages/jira/src/service/create-indices.handler',
      authorizer: 'admin',
    },
    'POST /jira/webhook': {
      function: 'packages/jira/src/webhook/webhook.handler',
      authorizer: 'none',
    },
    'GET /jira/auth': {
      function: 'packages/jira/src/service/auth.handler',
      authorizer: 'admin',
    },
    'GET /jira/callback': {
      function: 'packages/jira/src/service/callback.handler',
      authorizer: 'none',
    },
    'GET /jira/graph/first-time-pass-rate': {
      function: 'packages/jira/src/service/ftp-rate.handler',
      authorizer: 'universal',
    },
    // GET Jira project data
    'GET /jira/projects': {
      function: 'packages/jira/src/service/project/get-projects.handler',
      authorizer: 'universal',
    },
    'GET /jira/graph/reopen-rate': {
      function: 'packages/jira/src/service/reopen-rate.handler',
      authorizer: 'universal',
    },
    'GET /jira/migrate': {
      function: {
        handler: 'packages/jira/src/service/migrate.handler',
        bind: [projectMigrateQueue, userMigrateQueue, sprintMigrateQueue, issueMigrateQueue],
      },
      authorizer: 'admin',
    },
    'GET /jira/migrate/issue-status': {
      function: {
        handler: 'packages/jira/src/service/migrate.issueStatusHandler',
        bind: [issueStatusMigrateQueue],
      },
      authorizer: 'admin',
    },

    // api to update pxStatus in issueStatus table
    'GET /jira/update-issue-status': {
      function: {
        handler: 'packages/jira/src/service/issue/update-issue-status.handler',
      },
      authorizer: 'admin',
    },

    // GET Jira board and sprint data for a project
    'GET /jira/boards': {
      function: 'packages/jira/src/service/board/get-boards.handler',
      authorizer: 'universal',
    },

    'GET /jira/refresh-token': {
      function: {
        handler: 'packages/jira/src/cron/refresh-token.updateRefreshToken',
        bind: [jiraCredsTable, JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, JIRA_REDIRECT_URI],
      },
      authorizer: 'admin',
    },

    'GET /jira/reopen/migrate': {
      function: {
        handler: 'packages/jira/src/service/find-existing-bugs.handler',
        timeout: '2 minutes',
      },
      authorizer: 'admin',
    },

    // jira issue migration for time tracking (estimated vs actual)
    'GET /jira/{projectId}/issue/migrate': {
      function: {
        handler: 'packages/jira/src/migrations/issue-time-tracking.handler',
        timeout: '5 minutes',
        bind: [issueTimeTrackingMigrationQueue],
      },
      authorizer: 'admin',
    },

    // jira  reopen rate migration in case of issue delete
    // we need projectId and organization as query params in this API
    'POST /jira/issue-delete/reopen-rate/migrate': {
      function: {
        handler: 'packages/jira/src/migrations/issue-delete-reopen-rate.handler',
        timeout: '5 minutes',
      },
      authorizer: 'admin',
    },

    'GET /jira/subtask/migrate': {
      function: {
        handler: 'packages/jira/src/service/subtask-migration.handler',
        timeout: '5 minutes',
      },
      authorizer: 'admin',
    },
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

  return routesObj;
}
