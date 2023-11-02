import { logger } from 'core';
import { Jira } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { getBoardById } from '../../repository/board/get-board';
import { mappingToApiData } from './mapper';


/**
 * Updates a Jira board webhook.
 * @param board - The board object to update.
 * @param organization - The name of the organization.
 * @returns A Promise that resolves with void if the board is updated successfully, or false if the board is not found.
 */
export async function update(
    board: Jira.ExternalType.Webhook.Board,
    organization: string
): Promise<void | false> {
    const boardIndexData = await getBoardById(board.id, organization);
    if (!boardIndexData) {
        logger.info('boardUpdatedEvent: Board not found');
        return false;
    }

    const boardData = mappingToApiData(board, boardIndexData.createdAt, organization);
    logger.info('userUpdatedEvent: Send message to SQS');
    await new SQSClient().sendMessage(boardData, Queue.qBoardFormat.queueUrl);
}
