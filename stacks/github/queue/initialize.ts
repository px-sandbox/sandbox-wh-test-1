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

// eslint-disable-next-line max-lines-per-function,
export function initializeQueue(
    stack: Stack,
    githubDDb: GithubTables,
    sastErrorsBucket: Bucket
): { [key: string]: Queue } {
    const [
        commitFormatDataQueue,
        commitIndexDataQueue,
        ghMergedCommitProcessQueue,
        commitFileChanges,
    ] = initializeCommitQueue(stack, githubDDb);
    const [
        prReviewCommentFormatDataQueue,
        prReviewCommentIndexDataQueue,
        prReviewFormatDataQueue,
        prReviewIndexDataQueue,
    ] = initializePrReviewAndCommentsQueue(stack, githubDDb);
    const [prFormatDataQueue, prIndexDataQueue] = initializePrQueue(
        stack,
        ghMergedCommitProcessQueue,
        githubDDb
    );
    const [branchFormatDataQueue, branchIndexDataQueue] = initializeBranchQueue(stack, githubDDb);
    const [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue] = initializeCopilotQueue(stack);
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
    const [pushFormatDataQueue, pushIndexDataQueue] = initializePushQueue(stack, githubDDb);
    const [repoFormatDataQueue, repoIndexDataQueue, afterRepoSaveQueue] = initializeRepoQueue(
        stack,
        githubDDb,
        branchFormatDataQueue,
        branchIndexDataQueue
    );
    const [userFormatDataQueue, userIndexDataQueue] = initializeUserQueue(stack, githubDDb);
    const [branchCounterFormatterQueue, branchCounterIndexQueue] = initializeBranchCounterQueue(
        stack,
        githubDDb
    );
    const [depRegistryQueue, currentDepRegistryQueue, latestDepRegistry, masterLibraryQueue] =
        initializeRepoLibraryQueue(stack, githubDDb);

    const repoSastErrors = initializeRepoSastErrorQueue(stack, sastErrorsBucket, githubDDb);
    const [scansSaveQueue] = initializeSecurityScanQueue(stack);
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
        scansSaveQueue
    };
}
