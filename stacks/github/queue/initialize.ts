import { Stack } from 'aws-cdk-lib';
import { Bucket, Queue } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { initializeBranchQueue } from './branch';
import { initializeCommitQueue } from './commit';
import { initializeCopilotQueue } from './copilot';
import { initializeMigrationQueue } from './migrate';
import { initializePrQueue } from './pr';
import { initializePushQueue } from './push';
import { initializeRepoQueue } from './repo';
import { initializePrReviewAndCommentsQueue } from './review';
import { initializeUserQueue } from './user';
import { initializeBranchCounterQueue } from './branch-counter';
import { initializeRepoLibraryQueue } from './repo-library';
import { initializeRepoLibraryQueueV2 } from './repo-library-v2';
import { initializeRepoSastErrorQueue } from './repo-sast-errors';
import { initializeSecurityScanQueue } from './update-security-scan';
import { initializeIndexerQueue } from './indexer';
import { createGhTestCoverageQueue } from './test-coverage';
import { createGhDeploymentQueue } from './github-deployment';
import { initializeWorkbreakdownQueue } from './workbreakdown';

// eslint-disable-next-line max-lines-per-function,
export function initializeQueue(
  stack: Stack,
  githubDDb: GithubTables,
  buckets: {
    sastErrorsBucket: Bucket;
    versionUpgradeBucket: Bucket;
    testCoverageReportsBucket: Bucket;
  }
): { [key: string]: Queue } {
  const indexerQueue = initializeIndexerQueue(stack, githubDDb);
  const [commitFormatDataQueue, commitFileChanges, updateMergeCommit] = initializeCommitQueue(
    stack,
    githubDDb,
    indexerQueue
  );
  const prFormatDataQueue = initializePrQueue(stack, githubDDb, indexerQueue);
  const [prReviewCommentFormatDataQueue, prReviewFormatDataQueue, prReviewCommentMigrationQueue] =
    initializePrReviewAndCommentsQueue(stack, githubDDb, indexerQueue);
  const branchFormatDataQueue = initializeBranchQueue(stack, githubDDb, indexerQueue);
  const ghCopilotFormatDataQueue = initializeCopilotQueue(stack, indexerQueue);
  const [
    collectCommitsData,
    collectPRCommitsData,
    collectPRData,
    collectPRReviewCommentsData,
    collectReviewsData,
    historicalBranch,
    collecthistoricalPrBynumber,
  ] = initializeMigrationQueue(stack, githubDDb, [
    prFormatDataQueue,
    prReviewFormatDataQueue,
    prReviewCommentFormatDataQueue,
    commitFormatDataQueue,
  ]);
  const pushFormatDataQueue = initializePushQueue(stack, githubDDb, indexerQueue);
  const [repoFormatDataQueue, afterRepoSaveQueue] = initializeRepoQueue(
    stack,
    githubDDb,
    branchFormatDataQueue,
    indexerQueue
  );

  const userFormatDataQueue = initializeUserQueue(stack, githubDDb, indexerQueue);
  const branchCounterFormatterQueue = initializeBranchCounterQueue(stack, githubDDb, indexerQueue);
  const [masterLibraryQueue, repoLibS3Queue] = initializeRepoLibraryQueue(
    stack,
    githubDDb,
    buckets.versionUpgradeBucket
  );
  const [masterLibraryQueueV2, repoLibS3QueueV2] = initializeRepoLibraryQueueV2(
    stack,
    githubDDb,
    buckets.versionUpgradeBucket,
    masterLibraryQueue
  );

  const [repoSastErrors, repoSastErrorsV2] = initializeRepoSastErrorQueue(
    stack,
    buckets.sastErrorsBucket,
    githubDDb
  );
  const [scansSaveQueue] = initializeSecurityScanQueue(stack, githubDDb);
  const [testCoverageQueue] = createGhTestCoverageQueue(stack, buckets.testCoverageReportsBucket);
  const [githubDeploymentFrequencyQueue] = createGhDeploymentQueue(stack);
  const workbreakdownQueue = initializeWorkbreakdownQueue(stack, githubDDb);

  // Bindings for indexerQueue
  indexerQueue.bind([afterRepoSaveQueue]);

  return {
    branchFormatDataQueue,
    ghCopilotFormatDataQueue,
    collectCommitsData,
    collectPRCommitsData,
    collectPRData,
    collectPRReviewCommentsData,
    collectReviewsData,
    historicalBranch,
    collecthistoricalPrBynumber,
    pushFormatDataQueue,
    repoFormatDataQueue,
    afterRepoSaveQueue,
    userFormatDataQueue,
    commitFileChanges,
    commitFormatDataQueue,
    prFormatDataQueue,
    branchCounterFormatterQueue,
    prReviewCommentFormatDataQueue,
    prReviewFormatDataQueue,
    masterLibraryQueue,
    repoSastErrors,
    repoSastErrorsV2,
    scansSaveQueue,
    repoLibS3Queue,
    updateMergeCommit,
    prReviewCommentMigrationQueue,
    indexerQueue,
    testCoverageQueue,
    githubDeploymentFrequencyQueue,
    workbreakdownQueue,
    masterLibraryQueueV2,
    repoLibS3QueueV2,
  };
}
