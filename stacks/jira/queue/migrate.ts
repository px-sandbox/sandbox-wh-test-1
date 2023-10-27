import { Function, Queue, use } from 'sst/constructs';
import { Duration, Stack } from 'aws-cdk-lib';
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
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
      },
    }
  });
  sprintMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_sprint_migrate_func', {
      handler: 'packages/jira/src/migrations/sprint.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [
        sprintMigrateQueue,
        sprintFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(envs)
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const boardMigrateQueue = new Queue(stack, 'jira_board_migrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
      },
    }
  });

  boardMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_board_migrate_func', {
      handler: 'packages/jira/src/migrations/board.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [
        boardMigrateQueue,
        boardFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(envs)
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const projectMigrateQueue = new Queue(stack, 'jira_project_migrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
      },
    }
  });

  projectMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_project_migrate_func', {
      handler: 'packages/jira/src/migrations/project.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [
        projectMigrateQueue,
        projectFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(envs)
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const issueMigrateQueue = new Queue(stack, 'jira_issue_migrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
      },
    }
  });

  issueMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_issue_migrate_func', {
      handler: 'packages/jira/src/migrations/issue.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [
        issueMigrateQueue,
        issueFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(envs)
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const userMigrateQueue = new Queue(stack, 'jira_user_migrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
      },
    }
  });

  userMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'jira_user_migrate_func', {
      handler: 'packages/jira/src/migrations/user.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [
        userMigrateQueue,
        userFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(envs)
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  projectMigrateQueue.bind([boardMigrateQueue]);
  boardMigrateQueue.bind([sprintMigrateQueue]);
  sprintMigrateQueue.bind([issueMigrateQueue]);

  return [
    projectMigrateQueue,
    userMigrateQueue,
    boardMigrateQueue,
    sprintMigrateQueue,
    issueMigrateQueue,
  ];
}
