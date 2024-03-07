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
  const [commitFormatDataQueue, commitIndexDataQueue, commitFileChanges, updateMergeCommit] =
    initializeCommitQueue(stack, githubDDb, indexerQueue);
  const [prFormatDataQueue, prIndexDataQueue] = initializePrQueue(stack, githubDDb, indexerQueue);
  const [
    prReviewCommentFormatDataQueue,
    prReviewCommentIndexDataQueue,
    prReviewFormatDataQueue,
    prReviewIndexDataQueue,
    prReviewCommentMigrationQueue,
  ] = initializePrReviewAndCommentsQueue(stack, githubDDb, prIndexDataQueue, indexerQueue);
  const [branchFormatDataQueue, branchIndexDataQueue] = initializeBranchQueue(
    stack,
    githubDDb,
    indexerQueue
  );
  const [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue] = initializeCopilotQueue(
    stack,
    indexerQueue
  );
  const [
    collectCommitsData,
    collectPRCommitsData,
    collectPRData,
    collectPRReviewCommentsData,
    collectReviewsData,
    historicalBranch,
    collecthistoricalPrByumber,
  ] = initializeMigrationQueue(stack, githubDDb, [
    prFormatDataQueue,
    prReviewFormatDataQueue,
    prReviewCommentFormatDataQueue,
    commitFormatDataQueue,
  ]);
  const [pushFormatDataQueue, pushIndexDataQueue] = initializePushQueue(
    stack,
    githubDDb,
    indexerQueue
  );
  const [repoFormatDataQueue, repoIndexDataQueue, afterRepoSaveQueue] = initializeRepoQueue(
    stack,
    githubDDb,
    branchFormatDataQueue,
    branchIndexDataQueue,
    indexerQueue
  );
  const [userFormatDataQueue, userIndexDataQueue] = initializeUserQueue(
    stack,
    githubDDb,
    indexerQueue
  );
  const [branchCounterFormatterQueue, branchCounterIndexQueue] = initializeBranchCounterQueue(
    stack,
    githubDDb
  );
  const [
    depRegistryQueue,
    currentDepRegistryQueue,
    latestDepRegistry,
    masterLibraryQueue,
    repoLibS3Queue,
  ] = initializeRepoLibraryQueue(stack, githubDDb, buckets.versionUpgradeBucket);

  const repoSastErrors = initializeRepoSastErrorQueue(stack, buckets.sastErrorsBucket, githubDDb);
  const [scansSaveQueue] = initializeSecurityScanQueue(stack, githubDDb);
  return {
    branchFormatDataQueue,
    branchIndexDataQueue,
    ghCopilotFormatDataQueue,
    ghCopilotIndexDataQueue,
    collectCommitsData,
    collectPRCommitsData,
    collectPRData,
    collectPRReviewCommentsData,
    collectReviewsData,
    historicalBranch,
    collecthistoricalPrByumber,
    pushFormatDataQueue,
    pushIndexDataQueue,
    repoFormatDataQueue,
    repoIndexDataQueue,
    afterRepoSaveQueue,
    userFormatDataQueue,
    userIndexDataQueue,
    prIndexDataQueue,
    prReviewCommentIndexDataQueue,
    prReviewIndexDataQueue,
    commitIndexDataQueue,
    commitFileChanges,
    commitFormatDataQueue,
    prFormatDataQueue,
    branchCounterFormatterQueue,
    branchCounterIndexQueue,
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
