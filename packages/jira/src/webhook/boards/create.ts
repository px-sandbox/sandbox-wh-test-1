import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { mappingToApiData } from './mapper';

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
  organization: string
): Promise<void> {
  try {
    logger.info('boardCreatedEvent.invoked');
    const createdAt = moment(eventTime).toISOString();

    const boardData = mappingToApiData(board, createdAt, organization);
    logger.info('boardCreatedEvent: Send message to SQS');
    await new SQSClient().sendMessage(boardData, Queue.jira_board_format.queueUrl);
  } catch (error) {
    logger.error('boardCreatedEvent.error', { error });
  }
}
