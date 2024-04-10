import { Function, Queue, use } from 'sst/constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

// eslint-disable-next-line max-lines-per-function
export function initializeMigrateQueue(
  stack: Stack,
  jiraDDB: JiraTables,
  formatterQueues: Queue[]
): Queue[] {
  const envs = use(commonConfig);
  const { NODE_VERSION, ...restEnvs } = envs;
  const [
    projectFormatter,
    sprintFormatter,
    userFormatter,
    boardFormatter,
    issueFormatter,
    issueStatusFormatter,
  ] = formatterQueues;

  const sprintMigrateQueue = new Queue(stack, 'qSprintMigrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
        deadLetterQueue: getDeadLetterQ(stack, 'qSprintMigrate'),
      },
    },
  });
  sprintMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'fnSprintMigrate', {
      handler: 'packages/jira/src/migrations/sprint.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [
        sprintMigrateQueue,
        sprintFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(restEnvs),
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const boardMigrateQueue = new Queue(stack, 'qBoardMigrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
        deadLetterQueue: getDeadLetterQ(stack, 'qBoardMigrate'),
      },
    },
  });

  boardMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'fnBoardMigrate', {
      handler: 'packages/jira/src/migrations/board.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [
        boardMigrateQueue,
        boardFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(restEnvs),
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const projectMigrateQueue = new Queue(stack, 'qProjectMigrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
        deadLetterQueue: getDeadLetterQ(stack, 'qProjectMigrate'),
      },
    },
  });

  projectMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'fnProjectMigrate', {
      handler: 'packages/jira/src/migrations/project.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [
        projectMigrateQueue,
        projectFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(restEnvs),
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const issueStatusMigrateQueue = new Queue(stack, 'qIssueStatusMigrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
        deadLetterQueue: getDeadLetterQ(stack, 'qIssueStatusMigrate'),
      },
    },
  });
  issueStatusMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'fnIssueStatusMigrate', {
      handler: 'packages/jira/src/migrations/issue-status.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [
        issueStatusMigrateQueue,
        issueStatusFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(restEnvs),
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const issueMigrateQueue = new Queue(stack, 'qIssueMigrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
        deadLetterQueue: getDeadLetterQ(stack, 'qIssueMigrate'),
      },
    },
  });

  issueMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'fnIssueMigrate', {
      handler: 'packages/jira/src/migrations/issue.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [
        issueMigrateQueue,
        issueFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(restEnvs),
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const userMigrateQueue = new Queue(stack, 'qUserMigrate', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(310),
        deadLetterQueue: getDeadLetterQ(stack, 'qUserMigrate'),
      },
    },
  });

  userMigrateQueue.addConsumer(stack, {
    function: new Function(stack, 'fnUserMigrate', {
      handler: 'packages/jira/src/migrations/user.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [
        userMigrateQueue,
        userFormatter,
        ...Object.values(jiraDDB),
        ...Object.values(restEnvs),
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
    sprintMigrateQueue,
    issueStatusMigrateQueue,
    issueMigrateQueue,
    boardMigrateQueue,
  ];
}
