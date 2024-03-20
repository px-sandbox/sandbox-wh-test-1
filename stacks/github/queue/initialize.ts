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
import { initializeRepoSastErrorQueue } from './repo-sast-errors';
import { initializeSecurityScanQueue } from './update-security-scan';
import { initializeIndexerQueue } from './indexer';

// eslint-disable-next-line max-lines-per-function,
export function initializeQueue(
  stack: Stack,
  githubDDb: GithubTables,
  buckets: { sastErrorsBucket: Bucket; versionUpgradeBucket: Bucket }
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
  const [
    depRegistryQueue,
    currentDepRegistryQueue,
    latestDepRegistry,
    masterLibraryQueue,
    repoLibS3Queue,
  ] = initializeRepoLibraryQueue(stack, githubDDb, buckets.versionUpgradeBucket);

  const repoSastErrors = initializeRepoSastErrorQueue(stack, buckets.sastErrorsBucket, githubDDb);
  const [scansSaveQueue] = initializeSecurityScanQueue(stack, githubDDb);

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
    depRegistryQueue,
    currentDepRegistryQueue,
    latestDepRegistry,
    masterLibraryQueue,
    repoSastErrors,
    scansSaveQueue,
    repoLibS3Queue,
    updateMergeCommit,
    prReviewCommentMigrationQueue,
    indexerQueue,
  };
}
