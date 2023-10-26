import { Stack } from "aws-cdk-lib";
import { Function, Queue } from "sst/constructs";

export function initaializePrReviewAndCommentsQueue(stack: Stack): Queue[] {
    const prReviewCommentIndexDataQueue = new Queue(stack, 'gh_pr_review_comment_index');
    prReviewCommentIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_review_comment_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/pr-review-comment.handler',
            bind: [prReviewCommentIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const prReviewCommentFormatDataQueue = new Queue(stack, 'gh_pr_review_comment_format');
    prReviewCommentFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_review_comment_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/pr-review-comment.handler',
            bind: [prReviewCommentFormatDataQueue, prReviewCommentIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 1,
            },
        },
    });

    const prReviewIndexDataQueue = new Queue(stack, 'gh_pr_review_index');
    prReviewIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_review_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/pr-review.handler',
            bind: [prReviewIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const prReviewFormatDataQueue = new Queue(stack, 'gh_pr_review_format');
    prReviewFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_review_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/pr-review.handler',
            bind: [prReviewFormatDataQueue, prReviewIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    return [prReviewCommentFormatDataQueue, prReviewCommentIndexDataQueue, prReviewFormatDataQueue, prReviewIndexDataQueue]
}