import { Stack } from 'aws-cdk-lib';
import { Queue } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { initializeBranchCounterQueue } from './branch-counter';
import { initializeBranchQueue } from './branch';
import { initializeCommitQueue } from './commit';
import { initializeCopilotQueue } from './copilot';
import { initializeMigrationQueue } from './migrate';
import { initializePrQueue } from './pr';
import { initializePushQueue } from './push';
import { initializeRepoQueue } from './repo';
import { initializePrReviewAndCommentsQueue } from './review';
import { initializeUserQueue } from './user';

export function initializeQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
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

    return [
        ...initializeBranchCounterQueue(stack, githubDDb),
        ...initializeCopilotQueue(stack),
        ...initializeMigrationQueue(stack, githubDDb, [
            prFormatDataQueue,
            prReviewFormatDataQueue,
            prReviewCommentFormatDataQueue,
            commitFormatDataQueue,
        ]),
        ...initializePushQueue(stack, githubDDb),
        ...initializeRepoQueue(stack, githubDDb, branchFormatDataQueue, branchIndexDataQueue),
        ...initializeUserQueue(stack, githubDDb),
        prIndexDataQueue,
        prReviewCommentIndexDataQueue,
        prReviewIndexDataQueue,
        commitIndexDataQueue,
        commitFileChanges,
        branchFormatDataQueue,
        branchIndexDataQueue,
        commitFormatDataQueue,
        prFormatDataQueue
    ];
}
