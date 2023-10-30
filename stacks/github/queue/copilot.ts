import { Function, Queue, Stack, use } from "sst/constructs";
import { commonConfig } from "../../common/config";

export function initializeCopilotQueue(stack: Stack): Queue[] {
    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, GIT_ORGANIZATION_ID, GITHUB_APP_PRIVATE_KEY_PEM, GITHUB_SG_INSTALLATION_ID, GITHUB_APP_ID } = use(commonConfig)
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

    ghCopilotFormatDataQueue.bind([ghCopilotIndexDataQueue, GIT_ORGANIZATION_ID]);
    ghCopilotIndexDataQueue.bind([OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
    return [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue]
}