import { Stack } from "aws-cdk-lib";
import { Queue } from "sst/constructs";

export function initializeRepoQueue(stack: Stack): Queue[] {
    const repoIndexDataQueue = new Queue(stack, 'gh_repo_index', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/repo.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    const repoFormatDataQueue = new Queue(stack, 'gh_repo_format', {
        consumer: {
            function: {
                handler: 'packages/github/src/sqs/handlers/formatter/repo.handler',
                bind: [repoIndexDataQueue],
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    const afterRepoSaveQueue = new Queue(stack, 'gh_after_repo_save', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/save-branches.handler',
            cdk: {
                eventSource: {
                    batchSize: 1,
                },
            },
        },
    });
    return [repoFormatDataQueue, repoIndexDataQueue, afterRepoSaveQueue]
}