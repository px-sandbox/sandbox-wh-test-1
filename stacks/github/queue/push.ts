import { Stack } from "aws-cdk-lib";
import { Function, Queue } from "sst/constructs";

export function initailizePushQueue(stack: Stack): Queue[] {
    const pushIndexDataQueue = new Queue(stack, 'gh_push_index');
    pushIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_push_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/push.handler',
            bind: [pushIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const pushFormatDataQueue = new Queue(stack, 'gh_push_format');
    pushFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_push_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/push.handler',
            bind: [pushFormatDataQueue, pushIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    return [pushFormatDataQueue, pushIndexDataQueue]
}