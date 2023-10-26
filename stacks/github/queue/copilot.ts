import { Queue, Stack } from "sst/constructs";

export function initailizeCopilotQueue(stack: Stack): Queue[] {
    const ghCopilotIndexDataQueue = new Queue(stack, 'gh_copilot_index', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/gh-copilot.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    const ghCopilotFormatDataQueue = new Queue(stack, 'gh_copilot_format', {
        consumer: {
            function: {
                handler: 'packages/github/src/sqs/handlers/formatter/gh-copilot.handler',
                bind: [ghCopilotIndexDataQueue],
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    return [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue]
}