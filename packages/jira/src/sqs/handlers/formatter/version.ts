import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { deleteProcessfromDdb, logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { Jira } from 'abstraction';
import { mappingPrefixes } from '../../../constant/config';
import { saveVersionDetails } from 'src/repository/version/save-version';

async function saveVersionFormattedData(
    data: Jira.ExternalType.Webhook.Version,
    projectKey: string
): Promise<Jira.Type.Version> {
    const formattedData = {
        id: `${mappingPrefixes.version}_${data?.id}`,
        body: {
            id: `${mappingPrefixes.version}_${data?.id}`,
            projectId: `${mappingPrefixes.project}_${data?.projectId}`,
            name: data?.name,
            description: data?.description,
            archived: data?.archived,
            overdue: data?.overdue,
            released: data?.released,
            startDate: data?.startDate,
            releaseDate: data?.releaseDate,
            isDeleted: false,
            status: data?.status ?? null,
            projectKey,
        },
    };
    return formattedData;
}

export const handler = async function versionFormattedDataReciever(event: SQSEvent): Promise<void> {
    logger.info({ message: `Records Length: ${event.Records.length}` });

    await Promise.all(
        event.Records.map(async (record: SQSRecord) => {
            const {
                reqCtx: { requestId, resourceId },
                message: messageBody,
            } = JSON.parse(record.body);
            try {
                logger.info({
                    requestId,
                    resourceId,
                    message: 'VERSION_SQS_RECIEVER_HANDLER',
                    data: { messageBody },
                });
                switch (messageBody.eventName) {
                    case Jira.Enums.Event.VersionCreated:
                    case Jira.Enums.Event.VersionUpdated:
                    case Jira.Enums.Event.VersionReleased:
                        {
                            const processedData = await saveVersionFormattedData(messageBody.versionData, messageBody.projectKey);
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
                await deleteProcessfromDdb(messageBody.processId, { requestId, resourceId });
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
