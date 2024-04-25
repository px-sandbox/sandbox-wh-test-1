import { logger } from 'core';
import { Jira } from 'abstraction';
import moment from 'moment';
import { getSprintById } from '../../repository/sprint/get-sprint';
import { saveSprintDetails } from '../../repository/sprint/save-sprint';

/**
 * Deletes a sprint by ID.
 * @param sprintId - The ID of the sprint to delete.
 * @param eventTime - The time the event occurred.
 * @param organization - The organization the sprint belongs to.
 * @returns A Promise that resolves with void if the sprint was deleted successfully,
 *  or false if the sprint was not found.
 */
export async function deleteSprint(
  sprint: Jira.ExternalType.Webhook.Sprint,
  eventTime: moment.Moment,
  organization: string,
  requestId: string
): Promise<void | false> {
  const resourceId = sprint.id;
  try {
    logger.info({ requestId, resourceId, message: 'sprint delete event started for sprint id: ' });

    const sprintData = await getSprintById(sprint.id, organization, { requestId, resourceId });
    if (!sprintData) {
      logger.info({ requestId, resourceId, message: 'sprintDeletedEvent: Sprint not found' });
      return false;
    }

    const { _id, ...processSprintData } = sprintData;
    processSprintData.isDeleted = true;
    processSprintData.deletedAt = eventTime.toISOString();

    logger.info({ requestId, resourceId, message: `sprintDeletedEvent: Delete Sprint id ${_id}` });
    await saveSprintDetails({ id: _id, body: processSprintData } as Jira.Type.Sprint, {
      requestId,
      resourceId,
    });
  } catch (error) {
    logger.error({
      requestId,
      resourceId,
      message: 'sprintDeletedEvent: Error in deleting sprint',
      error,
    });
  }
}
