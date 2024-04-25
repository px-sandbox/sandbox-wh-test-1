import { logger } from 'core';
import { Jira } from 'abstraction';
import moment from 'moment';
import { saveProjectDetails } from '../../repository/project/save-project';
import { getProjectById } from '../../repository/project/get-project';

/**
 * Deletes a Jira project.
 * @param project - The project to be deleted.
 * @param eventTime - The time the event occurred.
 * @param organization - The organization the project belongs to.
 * @returns A Promise that resolves with void if the project was successfully deleted,
 *  or false if the project was not found.
 */
export async function deleteProject(
  projectId: number,
  eventTime: moment.Moment,
  organization: string,
  requestId: string
): Promise<void | false> {
  const resourceId = projectId.toString();
  logger.info({
    requestId,
    resourceId,
    message: 'projectDeletedEvent started for project id: ',
    data: { projectId },
  });

  const projectData = await getProjectById(projectId, organization, { requestId, resourceId });
  if (!projectData) {
    logger.info({ requestId, message: 'projectDeletedEvent: Project not found', resourceId });
    return false;
  }

  const { _id, ...processProjectData } = projectData;
  processProjectData.updatedAt = eventTime.toISOString();
  processProjectData.isDeleted = true;
  processProjectData.deletedAt = eventTime.toISOString();

  logger.info({ requestId, message: `projectDeletedEvent: Delete Project id ${_id}`, resourceId });
  await saveProjectDetails({ id: _id, body: processProjectData } as Jira.Type.Project, {
    requestId,
    resourceId,
  });
}
