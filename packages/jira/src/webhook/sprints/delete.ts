import { logger } from 'core';
import { Jira } from 'abstraction';
import moment from 'moment';
import { getSprintById } from '../../repository/sprint/get-sprint';
import { saveSprintDetails } from '../../repository/sprint/save-sprint';

/**
 * Deletes a sprint by ID.
 * @param sprintId - The ID of the sprint to delete.
 * @param eventTime - The time the event occurred.
 * @returns A Promise that resolves with void if the sprint was deleted successfully,
 *  or false if the sprint was not found.
 */
export async function deleteSprint(
  sprintId: string,
  eventTime: moment.Moment,
): Promise<void | false> {
  const sprintData = await getSprintById(sprintId);
  if (!sprintData) {
    logger.info('sprintDeletedEvent: Sprint not found');
    return false;
  }
  const { _id, ...processSprintData } = sprintData;

  processSprintData.isDeleted = true;
  processSprintData.deletedAt = moment(eventTime).toISOString();

  logger.info(`sprintDeletedEvent: Delete Sprint id ${_id}`);
  await saveSprintDetails({ id: _id, body: processSprintData } as Jira.Type.Sprint);

}
