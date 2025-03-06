import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { deleteProcessfromDdb, logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { saveVersionDetails } from '../../../repository/version/save-version';
import { mappingPrefixes } from '../../../constant/config';

function saveVersionFormattedData(
  data: Jira.ExternalType.Webhook.Version,
  projectKey: string
): Jira.Type.Version {
  const formattedData = {
    id: `${mappingPrefixes.version}_${data.id}`,
    body: {
      id: `${mappingPrefixes.version}_${data.id}`,
      projectId: `${mappingPrefixes.project}_${data.projectId}`,
      name: data.name,
      description: data.description,
      archived: data.archived,
      overdue: data.overdue,
      released: data.released,
      startDate: data.startDate,
      releaseDate: data.releaseDate,
      isDeleted: false,
      status: data?.status ?? null,
      projectKey,
    },
  };
  return formattedData;
}

export const handler = async function versionFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: { versionData, projectKey, eventName, processId },
      } = JSON.parse(record.body);
      try {
        logger.info({
          requestId,
          resourceId,
          message: 'VERSION_SQS_RECIEVER_HANDLER',
          data: { versionData, projectKey },
        });
        switch (eventName) {
          case Jira.Enums.Event.VersionCreated:
          case Jira.Enums.Event.VersionUpdated:
          case Jira.Enums.Event.VersionReleased:
            {
              const processedData = saveVersionFormattedData(versionData, projectKey);
              await saveVersionDetails(processedData);
            }
            break;
          default:
            logger.error({
              requestId,
              resourceId,
              message: 'versionFormattedDataReceiver.no_case_found',
            });
        }
        await deleteProcessfromDdb(processId, { requestId, resourceId });
      } catch (error) {
        await logProcessToRetry(record, Queue.qVersionFormat.queueUrl, error as Error);
        logger.error({
          requestId,
          resourceId,
          message: 'versionFormattedDataReceiver.error',
          error,
        });
      }
    })
  );
};
