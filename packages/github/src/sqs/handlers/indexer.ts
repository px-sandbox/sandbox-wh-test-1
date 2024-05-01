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
  logger.info(`Records Length: ${event.Records.length}`);
  await async.eachSeries(event.Records, async (record: SQSRecord) => {
    const messageBody = JSON.parse(record.body);
    logger.info('INDEXER_HANDLER', { eventType: messageBody.eventType });
    logger.info('INDEXER_HANDLER_MESSAGE', { messageBody });
    try {
      switch (messageBody.eventType) {
        case Github.Enums.Event.Repo:
          await saveRepoDetails(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.Branch:
          await saveBranchDetails(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.Commit:
          await saveCommitDetails(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.Commit_Push:
          await savePushDetails(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.PRReview:
          await savePRReview(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.PRReviewComment:
          await savePRReviewComment(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.PullRequest:
          await savePRDetails(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.Organization:
          await saveUserDetails(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.ActiveBranches:
          await saveActiveBranch(messageBody.data, messageBody.processId);
          break;
        case Github.Enums.Event.Copilot:
          await saveGHCopilotReport(messageBody.data);
          break;
        default:
          logger.error('indexDataReceiver.error', { error: 'action not found' });
          break;
      }
    } catch (error) {
      await logProcessToRetry(record, Queue.qGhIndex.queueUrl, error as Error);
      logger.error(`indexDataReceiver.error, ${error}`);
    }
  });
};
