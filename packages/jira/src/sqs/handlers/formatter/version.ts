import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { deleteProcessfromDdb, logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { mappingPrefixes } from '../../../constant/config';
import { saveVersionDetails } from '../../../repository/version/save-version';
import {
    deleteVersion,
    releaseVersion,
    UnreleaseVersion,
    updateVersionDetails,
} from '../../../repository/version/update-version';

function saveVersionFormattedData(
    data: Jira.ExternalType.Webhook.Version,
    projectKey: string,
    organizationId: string
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
            organizationId,
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
                message: { versionData, projectKey, eventName, processId, organizationId },
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
                        {
                            const processedData = saveVersionFormattedData(versionData, projectKey, organizationId);
                            await saveVersionDetails(processedData);
                        }
                        break;
                    case Jira.Enums.Event.VersionUpdated:
                        await updateVersionDetails(
                            `${mappingPrefixes.version}_${versionData.id}`,
                            versionData.name,
                            versionData.description,
                            versionData.startDate,
                            versionData.releaseDate,
                            versionData.archived,
                            versionData.overdue,
                        );
                        break;
                    case Jira.Enums.Event.VersionReleased:
                        await releaseVersion(
                            `${mappingPrefixes.version}_${versionData.id}`,
                            versionData.releaseDate
                        );
                        break;
                    case Jira.Enums.Event.VersionUnreleased:
                        await UnreleaseVersion(`${mappingPrefixes.version}_${versionData.id}`);
                        break;
                    case Jira.Enums.Event.VersionDeleted:
                        await deleteVersion(`${mappingPrefixes.version}_${versionData.id}`);
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
