import { Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

// eslint-disable-next-line max-lines-per-function
export function initializeMigrateQueue(
  stack: Stack,
  jiraDDB: JiraTables,
  formatterQueues: Queue[]
): Queue[] {
  const envs = use(commonConfig);

  const [projectFormatter, sprintFormatter, userFormatter, boardFormatter, issueFormatter] =
    formatterQueues;

  const sprintMigrateQueue = new Queue(stack, 'jira_sprint_migrate', {
    consumer: {
      function: {
        handler: 'packages/jira/src/migrations/sprint.handler',
        bind: [

          sprintFormatter,
          ...Object.values(jiraDDB),
          ...Object.values(envs)
        ],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const boardMigrateQueue = new Queue(stack, 'jira_board_migrate', {
    consumer: {
      function: {
        handler: 'packages/jira/src/migrations/board.handler',
        bind: [

          boardFormatter,
          ...Object.values(jiraDDB),
          ...Object.values(envs)
        ],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const projectMigrateQueue = new Queue(stack, 'jira_project_migrate', {
    consumer: {
      function: {
        handler: 'packages/jira/src/migrations/project.handler',
        bind: [

          projectFormatter,
          ...Object.values(jiraDDB),
          ...Object.values(envs)
        ],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const issueMigrateQueue = new Queue(stack, 'jira_issue_migrate', {
    consumer: {
      function: {
        handler: 'packages/jira/src/migrations/issue.handler',
        bind: [

          issueFormatter,
          ...Object.values(jiraDDB),
          ...Object.values(envs)
        ],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const userMigrateQueue = new Queue(stack, 'jira_user_migrate', {
    consumer: {
      function: {
        handler: 'packages/jira/src/migrations/user.handler',
        bind: [

          userFormatter,
          ...Object.values(jiraDDB),
          ...Object.values(envs)
        ],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  projectMigrateQueue.bind([boardMigrateQueue]);
  boardMigrateQueue.bind([sprintMigrateQueue]);
  sprintMigrateQueue.bind([issueMigrateQueue]);

  return [
    projectMigrateQueue,
    boardMigrateQueue,
    sprintMigrateQueue,
    issueMigrateQueue,
    userMigrateQueue,
  ];
}
