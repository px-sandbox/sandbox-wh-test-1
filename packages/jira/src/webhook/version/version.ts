import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { getOrganization } from '../../repository/organization/get-organization';
import { getProjectById } from 'src/repository/project/get-project';

const sqsClient = SQSClient.getInstance();

export async function version(
  versionData: Jira.ExternalType.Webhook.Version,
  eventName: string,
  organization: string,
  requestId: string
): Promise<void> {
  try {
    const orgId = await getOrganization(organization);
    if (!orgId) {
      throw new Error(`version.organization ${organization} not found`);
    }
    const projectData = await getProjectById(Number(versionData.projectId), organization, { requestId });
    if (!projectData) {
      throw new Error(`version.project ${projectData} not found`);
    }

    logger.info({
      requestId,
      resourceId: versionData.id,
      ...versionData,
      message: 'version.prepared_data',
    });

    await Promise.all([
      sqsClient.sendMessage(
        {
        versionData,
          eventName,
          organization,
          projectKey: projectData.key
        },
        Queue.qVersionFormat.queueUrl,
        { requestId, resourceId: versionData.id }
      ),
    ]);
    logger.info({ requestId, resourceId: versionData.id, message: 'version.success' });
  } catch (error) {
    logger.error({ requestId, resourceId: versionData.id, message: 'version.error', error });
    throw error;
  }
}
