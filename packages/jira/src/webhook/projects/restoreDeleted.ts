import { logger } from 'core';
import { Jira } from 'abstraction';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { JiraClient } from '../../lib/jira-client';
import { saveProjectDetails } from '../../repository/project/save-project';
import { getProjectById } from '../../repository/project/get-project';



/**
 * Restores a deleted project in Jira.
 * @param project The project to restore.
 * @param eventTime The time the event occurred.
 * @param organization The organization the project belongs to.
 * @returns A Promise that resolves with void if the project is successfully restored,
 *  or false if the project is not found.
 */
export async function restoreDeleted(
  projectId: number,
  eventTime: moment.Moment,
  organization: string
): Promise<void | false> {
  const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
  const jiraClient = await JiraClient.getClient(organization);
  const data = await jiraClient.getProject(projectId.toString());

  logger.info('projectRestoreDeletedEvent', { projectKey: data.key, availableProjectKeys: projectKeys });

  if (!projectKeys.includes(data.key)) {
    logger.info('projectRestoreDeletedEvent: Project not available in our system');
    return;
  }

  const projectData = await getProjectById(projectId, organization);
  if (!projectData) {
    logger.info('projectRestoreDeletedEvent: Project not found');
    return false;
  }

  const { _id, ...processProjectData } = projectData;
  processProjectData.updatedAt = eventTime.toISOString();
  processProjectData.isDeleted = false;
  processProjectData.deletedAt = null;

  logger.info(`projectRestoreDeletedEvent: Restore Deleted Project id ${_id}`);
  await saveProjectDetails({ id: _id, body: processProjectData } as Jira.Type.Project);
}
