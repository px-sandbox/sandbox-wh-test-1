import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { savePRReviewComment } from 'src/lib/savePullRequestReviewComment';
import { logProcessToRetry } from 'src/util/retryProcess';
import { Queue } from 'sst/node/queue';

export const handler = async function pullRequestReviewCommentIndexDataReciever(
  event: SQSEvent
): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);

        logger.info('PULL_REQUEST_REVIEW_COMMENT_SQS_RECIEVER_HANDLER_INDEXED', { messageBody });

        await savePRReviewComment(messageBody);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_pr_review_comment_index.queueUrl, error);
        logger.error('pRReviewCommentIndexDataReciever.error', { error });
      }
    })
  );
};
