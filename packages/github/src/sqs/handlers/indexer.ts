import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github } from 'abstraction';
import async from 'async';
import { saveRepoDetails } from '../../lib/save-repo';
import { saveBranchDetails } from '../../lib/save-branch';
import { savePRReview } from '../../lib/save-pr-review';
import { savePRReviewComment } from '../../lib/save-pr-review-comment';
import { savePRDetails } from '../../lib/save-pull-request';
import { savePushDetails } from '../../lib/save-push';
import { saveUserDetails } from '../../lib/save-user';
import { saveActiveBranch } from '../../lib/save-active-branches';
import { saveGHCopilotReport } from '../../lib/save-copilot-report';
import { logProcessToRetry } from '../../util/retry-process';
import { saveCommitDetails } from '../../lib/save-commit';

export const handler = async function indexDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: "Records Length", data: JSON.stringify(event.Records.length)});
  await async.eachSeries(event.Records, async (record: SQSRecord) => {
    const { reqCtx: { requestId, resourceId }, messageBody } = JSON.parse(record.body);
    logger.info({ message: 'INDEXER_HANDLER', data: { eventType: messageBody.eventType }, requestId, resourceId});
    logger.info({ message: 'INDEXER_HANDLER_MESSAGE',data: messageBody , requestId, resourceId});
    try {
      switch (messageBody.eventType) {
        case Github.Enums.Event.Repo:
          await saveRepoDetails(messageBody.data, {requestId, resourceId},messageBody.processId);
          break;
        case Github.Enums.Event.Branch:
          await saveBranchDetails(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.Commit:
          await saveCommitDetails(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.Commit_Push:
          await savePushDetails(messageBody.data, { requestId, resourceId },messageBody.processId);
          break;
        case Github.Enums.Event.PRReview:
          await savePRReview(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.PRReviewComment:
          await savePRReviewComment(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.PullRequest:
          await savePRDetails(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.Organization:
          await saveUserDetails(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.ActiveBranches:
          await saveActiveBranch(messageBody.data, { requestId, resourceId }, messageBody.processId);
          break;
        case Github.Enums.Event.Copilot:
          await saveGHCopilotReport(messageBody.data, { requestId, resourceId });
          break;
        default:
          logger.error({ message: 'indexDataReceiver.error',  error: 'action not found', requestId, resourceId});
          break;
      }
    } catch (error) {
      await logProcessToRetry(record, Queue.qGhIndex.queueUrl, error as Error);
      logger.error({ message: "indexDataReceiver.error", error, requestId, resourceId });
    }
  });
};
