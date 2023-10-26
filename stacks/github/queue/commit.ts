import { Stack } from "aws-cdk-lib";
import { Function, Queue } from "sst/constructs";

export function initailizeCommitQueue(stack: Stack): Queue[] {

    const commitIndexDataQueue = new Queue(stack, 'gh_commit_index');
    commitIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_commit_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/commit.handler',
            bind: [commitIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const commitFormatDataQueue = new Queue(stack, 'gh_commit_format', {
        cdk: {
            queue: {
                fifo: true,
            },
        },
    });
    commitFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_commit_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/commit.handler',
            bind: [commitFormatDataQueue, commitIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const ghMergedCommitProcessQueue = new Queue(stack, 'gh_merge_commit_process');
    ghMergedCommitProcessQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_merge_commit_process_func', {
            handler: 'packages/github/src/sqs/handlers/merge-commit.handler',
            bind: [ghMergedCommitProcessQueue, commitFormatDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    return [commitFormatDataQueue, commitIndexDataQueue, ghMergedCommitProcessQueue]
}