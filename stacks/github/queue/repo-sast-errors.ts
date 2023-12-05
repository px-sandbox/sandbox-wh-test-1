import { Stack } from "aws-cdk-lib";
import { Bucket, Function, Queue, use } from "sst/constructs";
import { commonConfig } from "../../common/config";

export function initializeRepoSastErrorQueue(stack: Stack, sastErrorsBucket: Bucket): Queue {

    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } =
        use(commonConfig);
    const repoSastErrorsQueue = new Queue(stack, 'qGhRepoSastError');
    repoSastErrorsQueue.addConsumer(stack, {
        function: new Function(stack, 'fnRepoSastScansErrorHandler', {
            handler: 'packages/github/src/sqs/handlers/formatter/repo-sast-errors.handler',
            bind: [
                OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME,
                sastErrorsBucket, repoSastErrorsQueue,
            ],

        }),
    });

    return repoSastErrorsQueue
}