import { logger } from 'core';
import { Jira } from 'abstraction';
import moment from 'moment';
import { saveProjectDetails } from '../../repository/project/save-project';
import { getProjectById } from '../../repository/project/get-project';

/**
 * Deletes a Jira project.
 * @param project - The project to be deleted.
 * @param eventTime - The time the event occurred.
 * @returns A Promise that resolves with void if the project was successfully deleted,
 *  or false if the project was not found.
 */
export async function deleteProject(
  projectId: number,
  eventTime: moment.Moment,
): Promise<void | false> {
  const projectData = await getProjectById(projectId);
  if (!projectData) {
    logger.info('projectDeletedEvent: Project not found');
    return false;
  }
  const { _id, ...processProjectData } = projectData;
  processProjectData.updatedAt = moment(eventTime).toISOString();
  processProjectData.isDeleted = true;
  processProjectData.deletedAt = moment(eventTime).toISOString();

  logger.info(`projectDeletedEvent: Delete Project id ${_id}`);
  await saveProjectDetails({ id: _id, body: processProjectData } as Jira.Type.Project);

}
