import { Stack } from "aws-cdk-lib";
import { Function, Queue } from "sst/constructs";

export function initailizePrQueue(stack: Stack, ghMergedCommitProcessQueue: Queue): Queue[] {
    const prIndexDataQueue = new Queue(stack, 'gh_pr_index');
    prIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/pull-request.handler',
            bind: [prIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const prFormatDataQueue = new Queue(stack, 'gh_pr_format');
    prFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
            timeout: '30 seconds',
            bind: [prFormatDataQueue, prIndexDataQueue, ghMergedCommitProcessQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    return [prFormatDataQueue, prIndexDataQueue]
}