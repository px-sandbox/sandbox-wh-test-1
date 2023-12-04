import { Stack } from "aws-cdk-lib";
import { Bucket, Function, Queue, use } from "sst/constructs";
import { commonConfig } from "../../common/config";

export function initializeRepoSastScanQueue(stack: Stack, bucket: Bucket): Queue {

    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, GIT_ORGANIZATION_ID } =
        use(commonConfig);
    const repoSastScansQueue = new Queue(stack, 'qGhRepoSastError');
    repoSastScansQueue.addConsumer(stack, {
        function: new Function(stack, 'fnRepoSastScansHandler', {
            handler: 'packages/github/src/sqs/handlers/formatter/repo-sast-scans.handler',
            bind: [
                OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME,
                bucket, repoSastScansQueue, GIT_ORGANIZATION_ID,
            ],

        }),
    });

    return repoSastScansQueue
}