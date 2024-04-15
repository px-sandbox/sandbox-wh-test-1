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
import { logProcessToRetry } from '../../util/retry-process';
import { saveReOpenRate } from '../../repository/issue/save-reopen-rate';

export const handler = async function jiraIndexDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const { index, data: messageBody, processId } = JSON.parse(record.body);
        logger.info(`${index} SQS_RECIEVER_HANDLER_INDEXED`, { messageBody });

        switch (index) {
          case Jira.Enums.IndexName.Board:
            await saveBoardDetails(messageBody, processId);
            break;
          case Jira.Enums.IndexName.Issue:
            await saveIssueDetails(messageBody, processId);
            break;
          case Jira.Enums.IndexName.IssueStatus:
            await saveIssueStatusDetails(messageBody, processId);
            break;
          case Jira.Enums.IndexName.Project:
            await saveProjectDetails(messageBody, processId);
            break;
          case Jira.Enums.IndexName.Sprint:
            await saveSprintDetails(messageBody, processId);
            break;
          case Jira.Enums.IndexName.Users:
            await saveUserDetails(messageBody, processId);
            break;
          case Jira.Enums.IndexName.ReopenRate:
            await saveReOpenRate(messageBody, processId);
            break;
          default:
            logger.error('jiraIndexDataReceiver.error', { error: `${index} indexer not found` });
            break;
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.qJiraIndex.queueUrl, error as Error);
        logger.error(`jiraIndexDataReceiver.error, ${error}`);
      }
    })
  );
};
