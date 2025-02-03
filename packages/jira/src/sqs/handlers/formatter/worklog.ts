import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import _ from 'lodash';
import { deleteProcessfromDdb, logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { saveWorklogDetails } from '../../../repository/worklog/save-worklog';
import { Jira } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { getOrganization } from 'src/repository/organization/get-organization';
import { updateWorklogDetails } from 'src/repository/worklog/update-worklog';

export const handler = async function worklogFormattedDataReciever(event: SQSEvent): Promise<void> {
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
          message: 'WORKLOG_SQS_RECIEVER_HANDLER',
          data: { messageBody },
        });
        let formattedData: Jira.Type.Worklog;
        switch (messageBody.eventName) {
          case Jira.Enums.Event.WorklogCreated:
            const processedData = await saveFormattedData(messageBody);
            await saveWorklogDetails(processedData, { requestId, resourceId }, messageBody.processId);
            break;
          case Jira.Enums.Event.WorklogUpdated:
            formattedData = await updateFormattedData(messageBody);
            await updateWorklogDetails(formattedData, { requestId, resourceId });
            break;
          case Jira.Enums.Event.WorklogDeleted:
            formattedData = await deleteFormattedData(messageBody);
            await updateWorklogDetails(formattedData, { requestId, resourceId });
            break;
          default:
            logger.error({
              requestId: requestId,
              resourceId: resourceId,
              message: 'worklogFormattedDataReceiver.no_case_found',
            });
        }
        await deleteProcessfromDdb(messageBody.processId, { requestId, resourceId });
      } catch (error) {
        await logProcessToRetry(record, Queue.qWorklogFormat.queueUrl, error as Error);
        logger.error({
          requestId,
          resourceId,
          message: 'worklogFormattedDataReciever.error',
          error,
        });
      }
    })
  );
};

async function saveFormattedData(data: Jira.ExternalType.Webhook.Worklog): Promise<Jira.Type.Worklog> {
  const orgData = await getOrganization(data.organization);
  if (!orgData) {
    logger.error({
      message: `Organization ${data.organization} not found`,
    });
    throw new Error(`Organization ${data.organization} not found`);
  }
  const formattedData = {
    id: `${mappingPrefixes.worklog}_${data?.id}`,
    body: {
      id: `${mappingPrefixes.worklog}_${data?.id}`,
      projectKey: data?.issueData.projectKey,
      issueKey: data?.issueData.issueKey,
      timeLogged: data?.timeSpentSeconds,
      category: null,
      date: data?.started,
      createdAt: data?.created,
      isDeleted: false,
      organizationId: orgData.id ?? null,
    },
  };
  return formattedData;
}

async function updateFormattedData(data: Jira.ExternalType.Webhook.Worklog): Promise<Jira.Type.Worklog> {
  const formattedData = {
    id: `${mappingPrefixes.worklog}_${data?.id}`,
    body: {
      timeLogged: data?.timeSpentSeconds,
      date: data?.started,
    },
  };
  return formattedData;
}

async function deleteFormattedData(data: Jira.ExternalType.Webhook.Worklog): Promise<Jira.Type.Worklog> {
  const formattedData = {
    id: `${mappingPrefixes.worklog}_${data?.id}`,
    body: {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    },
  };
  return formattedData;
}

