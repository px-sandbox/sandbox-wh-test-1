import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { JiraClient } from '../../lib/jira-client';
import { mappingToApiData } from './mapper';

const sqsClient = SQSClient.getInstance();

/**
 * Sends a message to an SQS queue when a Jira board is created.
 * @param board The Jira board that was created.
 * @param eventTime The time the event occurred.
 * @param organization The organization associated with the board.
 * @returns A Promise that resolves when the message is sent to the SQS queue.
 */
export async function create(
  board: Jira.ExternalType.Webhook.Board,
  eventTime: moment.Moment,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = board.id.toString();
  try {
    logger.info({ requestId, resourceId, message: 'boardCreatedEvent.invoked' });
    const jiraClient = await JiraClient.getClient(organization);
    const apiBoardData = await jiraClient.getBoard(board.id);

    // checking is project type is 'software'. We dont wanna save maintainence projects.

    logger.info({ requestId, resourceId, message: 'boardCreatedEvent: Checking project type' });
    if (apiBoardData.location.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE) {
      const createdAt = moment(eventTime).toISOString();

      const boardData = mappingToApiData(board, createdAt, organization);
      logger.info({ requestId, resourceId, message: 'boardCreatedEvent: Send message to SQS' });

      await sqsClient.sendMessage(boardData, Queue.qBoardFormat.queueUrl, {
        requestId,
        resourceId,
      });
    }
  } catch (error) {
    logger.error({ requestId, resourceId, message: 'boardCreatedEvent.error', error });
  }
}
