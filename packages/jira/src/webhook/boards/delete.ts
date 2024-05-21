import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { getBoardById } from '../../repository/board/get-board';
import { saveBoardDetails } from '../../repository/board/save-board';

/**
 * Deletes a board by its ID and sets the `isDeleted` flag to `true`.
 * @param boardId - The ID of the board to be deleted.
 * @param eventTime - The time when the board was deleted.
 * @param organization - The organization the board belongs to.
 * @returns A promise that resolves with `void` if the board was successfully deleted,
 *  or `false` if the board was not found.
 */
export async function deleteBoard(
  boardId: number,
  eventTime: moment.Moment,
  organization: string,
  requestId: string
): Promise<void | false> {
  const resourceId = boardId.toString();
  logger.info({
    requestId,
    resourceId,
    message: 'boardDeletedEvent started for board id: ',
    data: { boardId },
  });

  const boardData = await getBoardById(boardId, organization, { requestId, resourceId });
  if (!boardData) {
    logger.info({ requestId, resourceId, message: 'boardDeletedEvent: Board not found' });
    return false;
  }

  const { _id, ...processBoardData } = boardData;

  processBoardData.isDeleted = true;
  processBoardData.deletedAt = eventTime.toISOString();

  logger.info({ requestId, resourceId, message: `boardDeletedEvent: Delete Board id ${_id}` });
  await saveBoardDetails({ id: _id, body: processBoardData } as Jira.Type.Board, {
    requestId,
    resourceId,
  });
}
