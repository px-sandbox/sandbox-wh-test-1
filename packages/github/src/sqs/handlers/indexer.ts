import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveCommitDetails } from '../../lib/save-commit';
import { logProcessToRetry } from '../../util/retry-process';
import { Github } from 'abstraction';
import { saveRepoDetails } from 'src/lib/save-repo';
import { saveBranchDetails } from 'src/lib/save-branch';
import { savePRReview } from 'src/lib/save-pr-review';
import { savePRReviewComment } from 'src/lib/save-pr-review-comment';
import { savePRDetails } from 'src/lib/save-pull-request';
import { savePushDetails } from 'src/lib/save-push';
import async from 'async';
import { saveUserDetails } from 'src/lib/save-user';
import { saveActiveBranch } from 'src/lib/save-active-branches';
import { saveGHCopilotReport } from 'src/lib/save-copilot-report';

export const handler = async function indexDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await async.eachSeries(event.Records, async (record: SQSRecord) => {
    const messageBody = JSON.parse(record.body);
    logger.info('INDEXER_HANDLER', { eventType: messageBody.eventType });
    try {
      switch (messageBody.eventType) {
        case Github.Enums.Event.Repo:
          await saveRepoDetails(messageBody.data);
          break;
        case Github.Enums.Event.Branch:
          await saveBranchDetails(messageBody.data);
          break;
        case Github.Enums.Event.Commit:
          await saveCommitDetails(messageBody.data);
          break;
        case Github.Enums.Event.Commit_Push:
          await savePushDetails(messageBody.data);
          break;
        case Github.Enums.Event.PRReview:
          await savePRReview(messageBody.data);
          break;
        case Github.Enums.Event.PRReviewComment:
          await savePRReviewComment(messageBody.data);
          break;
        case Github.Enums.Event.PullRequest:
          await savePRDetails(messageBody.data);
          break;
        case Github.Enums.Event.Organization:
          await saveUserDetails(messageBody.data);
          break;
        case Github.Enums.Event.ActiveBranches:
          await saveActiveBranch(messageBody.data);
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
      logger.error('indexDataReceiver.error', { errorInfo: JSON.stringify(error) });
    }
  });
};
