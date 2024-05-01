import { Duration, Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';
import { getDeadLetterQ } from '../../common/dead-letter-queue';

// eslint-disable-next-line max-lines-per-function,
export function initializeMigrationQueue(
  stack: Stack,
  githubDDb: GithubTables,
  formatterQueue: Queue[]
): Queue[] {
  const {
    GIT_ORGANIZATION_ID,
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_SG_INSTALLATION_ID,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    NODE_VERSION,
  } = use(commonConfig);
  const [
    prFormatDataQueue,
    prReviewFormatDataQueue,
    prReviewCommentFormatDataQueue,
    commitFormatDataQueue,
  ] = formatterQueue;
  const { retryProcessTable, githubMappingTable } = githubDDb;
  const collectPRData = new Queue(stack, 'qGhHistoricalPr', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalPr'),
      },
    },
  });

  collectPRData.addConsumer(stack, {
    function: new Function(stack, 'fnHistoricalPR', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [collectPRData],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const collectReviewsData = new Queue(stack, 'qGhHistoricalReviews', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalReviews'),
      },
    },
  });

  collectReviewsData.addConsumer(stack, {
    function: new Function(stack, 'fnHistPrReview', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-review.handler',
      timeout: '30 seconds',
      runtime: NODE_VERSION,
      bind: [collectReviewsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const collecthistoricalPrByumber = new Queue(stack, 'qGhHistoricalPrByNumber', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalPrByNumber'),
      },
    },
  });
  collecthistoricalPrByumber.addConsumer(stack, {
    function: new Function(stack, 'fnHistPrByNumber', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-by-number.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [collecthistoricalPrByumber],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const collectCommitsData = new Queue(stack, 'qGhHistoricalCommits', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalCommits'),
      },
    },
  });
  collectCommitsData.addConsumer(stack, {
    function: new Function(stack, 'fnHistCommit', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-commit.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [collectCommitsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 2,
      },
    },
  });

  const historicalBranch = new Queue(stack, 'qGhHistoricalBranch', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalBranch'),
      },
    },
  });

  historicalBranch.addConsumer(stack, {
    function: new Function(stack, 'fnHistBranch', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-branch.handler',
      bind: [historicalBranch],
      runtime: NODE_VERSION,
      timeout: '300 seconds',
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 2,
      },
    },
  });

  const collectPRCommitsData = new Queue(stack, 'qGhHistoricalPrCommits', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalPrCommits'),
      },
    },
  });
  collectPRCommitsData.addConsumer(stack, {
    function: new Function(stack, 'fnHistPRCommit', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-commit.handler',
      timeout: '30 seconds',
      runtime: NODE_VERSION,
      bind: [collectPRCommitsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const collectPRReviewCommentsData = new Queue(stack, 'qGhHistoricalPrComments', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
        deadLetterQueue: getDeadLetterQ(stack, 'qGhHistoricalPrComments'),
      },
    },
  });
  collectPRReviewCommentsData.addConsumer(stack, {
    function: new Function(stack, 'fnHistPRReviewComments', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-comment.handler',
      timeout: '300 seconds',
      runtime: NODE_VERSION,
      bind: [collectPRReviewCommentsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  collectPRData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    collectReviewsData,
    GIT_ORGANIZATION_ID,
    collectPRCommitsData,
    collectPRReviewCommentsData,
  ]);
  collecthistoricalPrByumber.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    prFormatDataQueue,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
  ]);
  collectReviewsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    collecthistoricalPrByumber,
    prReviewFormatDataQueue,
  ]);

  collectCommitsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
    collectPRData,
  ]);

  collectPRCommitsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
  ]);

  collectPRReviewCommentsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    prReviewCommentFormatDataQueue,
  ]);

  historicalBranch.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    REQUEST_TIMEOUT,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    collectCommitsData,
  ]);

  return [
    collectCommitsData,
    collectPRCommitsData,
    collectPRData,
    collectPRReviewCommentsData,
    collectReviewsData,
    historicalBranch,
    collecthistoricalPrByumber,
  ];
}
