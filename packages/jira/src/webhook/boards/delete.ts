
import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';
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
    organization: string
): Promise<void | false> {
    const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
    const jiraClient = await JiraClient.getClient(organization);
    const data = await jiraClient.getBoard(boardId);

    logger.info('boardDeletedEvent', { projectKey: data.location.projectKey, availableProjectKeys: projectKeys });

    if (!projectKeys.includes(data.location.projectKey)) {
        logger.info('boardDeletedEvent: Project not available in our system');
        return;
    }

    const boardData = await getBoardById(boardId, organization);
    if (!boardData) {
        logger.info('boardDeletedEvent: Board not found');
        return false;
    }

    const { _id, ...processBoardData } = boardData;

    processBoardData.isDeleted = true;
    processBoardData.deletedAt = eventTime.toISOString();

    logger.info(`boardDeletedEvent: Delete Board id ${_id}`);
    await saveBoardDetails({ id: _id, body: processBoardData } as Jira.Type.Board);
}
