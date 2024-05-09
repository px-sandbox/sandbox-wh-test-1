import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { saveBoardDetails } from '../../repository/board/save-board';
import { saveIssueDetails } from '../../repository/issue/save-issue';
import { saveIssueStatusDetails } from '../../repository/issue/save-issue-status';
import { saveProjectDetails } from '../../repository/project/save-project';
import { saveSprintDetails } from '../../repository/sprint/save-sprint';
import { saveUserDetails } from '../../repository/user/save-user';
import { logProcessToRetry } from 'rp';
import { saveReOpenRate } from '../../repository/issue/save-reopen-rate';

export const handler = async function jiraIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        message,
        reqCtx: { requestId, resourceId },
      } = JSON.parse(record.body);
      const { index, data: messageBody, processId } = message;

      try {
        logger.info({
          requestId,
          resourceId,
          message: `${index} SQS_RECIEVER_HANDLER_INDEXED`,
          data: { message },
        });

        switch (index) {
          case Jira.Enums.IndexName.Board:
            await saveBoardDetails(messageBody, { requestId, resourceId }, processId);
            break;
          case Jira.Enums.IndexName.Issue:
            await saveIssueDetails(messageBody, { requestId, resourceId }, processId);
            break;
          case Jira.Enums.IndexName.IssueStatus:
            await saveIssueStatusDetails(messageBody, { requestId, resourceId }, processId);
            break;
          case Jira.Enums.IndexName.Project:
            await saveProjectDetails(messageBody, { requestId, resourceId }, processId);
            break;
          case Jira.Enums.IndexName.Sprint:
            await saveSprintDetails(messageBody, { requestId, resourceId }, processId);
            break;
          case Jira.Enums.IndexName.Users:
            await saveUserDetails(messageBody, { requestId, resourceId }, processId);
            break;
          case Jira.Enums.IndexName.ReopenRate:
            await saveReOpenRate(messageBody, { requestId, resourceId }, processId);
            break;
          default:
            logger.error({
              requestId,
              resourceId,
              message: 'jiraIndexDataReceiver.error',
              error: `${index} indexer not found`,
            });
            break;
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.qJiraIndex.queueUrl, error as Error);
        logger.error({ requestId, resourceId, message: 'jiraIndexDataReceiver.error', error });
      }
    })
  );
};
