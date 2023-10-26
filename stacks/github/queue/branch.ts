import { Stack } from "aws-cdk-lib";
import { Queue } from "sst/constructs";


export function initailizeBranchQueue(stack: Stack): Queue[] {
    const branchIndexDataQueue = new Queue(stack, 'gh_branch_index', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/branch.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    const branchFormatDataQueue = new Queue(stack, 'gh_branch_format', {
        consumer: {
            function: {
                handler: 'packages/github/src/sqs/handlers/formatter/branch.handler',
                bind: [branchIndexDataQueue],
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    return [branchFormatDataQueue, branchIndexDataQueue]
}