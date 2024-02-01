import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

// eslint-disable-next-line max-lines-per-function,
export function initializePrReviewAndCommentsQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, NODE_VERSION } =
        use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDb;
    const prReviewCommentIndexDataQueue = new Queue(stack, 'qGhPrReviewCommentIndex');
    prReviewCommentIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhPrReviewCommentIndex', {
            handler: 'packages/github/src/sqs/handlers/indexer/pr-review-comment.handler',
            bind: [prReviewCommentIndexDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const prReviewCommentFormatDataQueue = new Queue(stack, 'qGhPrReviewCommentFormat');
    prReviewCommentFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhPrReviewCommentFormat', {
            handler: 'packages/github/src/sqs/handlers/formatter/pr-review-comment.handler',
            bind: [prReviewCommentFormatDataQueue, prReviewCommentIndexDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 1,
            },
        },
    });

    const prReviewIndexDataQueue = new Queue(stack, 'qGhPrReviewIndex');
    prReviewIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhPrReviewIndex', {
            handler: 'packages/github/src/sqs/handlers/indexer/pr-review.handler',
            bind: [prReviewIndexDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const prReviewFormatDataQueue = new Queue(stack, 'qGhPrReviewFormat');
    prReviewFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhPrReviewFormat', {
            handler: 'packages/github/src/sqs/handlers/formatter/pr-review.handler',
            bind: [prReviewFormatDataQueue, prReviewIndexDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    prReviewCommentFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        prReviewCommentIndexDataQueue,
        GIT_ORGANIZATION_ID,
    ]);

    prReviewCommentIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    prReviewFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        prReviewIndexDataQueue,
        GIT_ORGANIZATION_ID,
    ]);
    prReviewIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [
        prReviewCommentFormatDataQueue,
        prReviewCommentIndexDataQueue,
        prReviewFormatDataQueue,
        prReviewIndexDataQueue,
    ];
}
