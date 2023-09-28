import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import moment from 'moment';
import { mappingToApiData } from './mapper';

export async function boardCreatedEvent(
  board: Jira.ExternalType.Webhook.Board,
  eventTime: moment.Moment,
  organization: string
): Promise<void> {
  const createdAt = moment(eventTime).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  const boardData = mappingToApiData(board, createdAt, organization);
  logger.info('userCreatedEvent: Send message to SQS');
  await new SQSClient().sendMessage(boardData, Queue.jira_board_format.queueUrl);
}
