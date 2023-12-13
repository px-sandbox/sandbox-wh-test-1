import { Stack } from 'aws-cdk-lib';
import { Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';

// eslint-disable-next-line max-lines-per-function,
export function initializeSecurityScanQueue(
    stack: Stack,
): Queue[] {
    const {
        // GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        GITHUB_APP_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_SG_INSTALLATION_ID,
    } = use(commonConfig);



    const scansSaveQueue = new Queue(stack, 'qGhScansSave', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/update-security-scans.handler',
            cdk: {
                eventSource: {
                    batchSize: 1,
                },

            },
        },
    });



    scansSaveQueue.bind([
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [scansSaveQueue];
}