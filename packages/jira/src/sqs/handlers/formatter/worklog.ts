import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { saveWorklogDetails } from '../../../repository/worklog/save-worklog';
import { Jira } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { getOrganization } from 'src/repository/organization/get-organization';
import { getWorklogById } from 'src/repository/worklog/get-worklog';
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
            formattedData = await updateFormattedData(messageBody, requestId, resourceId);
            await updateWorklogDetails(formattedData, { requestId, resourceId });
            break;
          case Jira.Enums.Event.WorklogDeleted:
            formattedData = await deleteFormattedData(messageBody, requestId, resourceId);
            await updateWorklogDetails(formattedData, { requestId, resourceId });
            break;
          default:
            logger.error({
              requestId: requestId,
              resourceId: resourceId,
              message: 'worklogFormattedDataReceiver.no_case_found',
            });
        }
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

async function updateFormattedData(data: Jira.ExternalType.Webhook.Worklog, requestId: string, resourceId: string): Promise<Jira.Type.Worklog> {
  const orgData = await getOrganization(data.organization);
  if (!orgData) {
    logger.error({
      requestId: requestId,
      resourceId: resourceId,
      message: `Organization ${data.organization} not found`,
    });
    throw new Error(`Organization ${data.organization} not found`);
  }
  const reqCtx = { requestId: requestId, resourceId: resourceId };
  const worklogData = await getWorklogById(data.id, data.organization, reqCtx);
  if (!worklogData) {
    logger.error({
      requestId: requestId,
      resourceId: resourceId,
      message: `WorklogID ${data.id} not found`,
    });
    throw new Error(`WorklogID ${data.id} not found`);
  }
  logger.info({
    requestId: requestId,
    resourceId: resourceId,
    message: 'GET_WORKLOG_DATA',
    data: { worklogData },
  });
  const formattedData = {
    id: `${mappingPrefixes.worklog}_${data?.id}`,
    body: {
      id: `${mappingPrefixes.worklog}_${data?.id}`,
      timeLogged: data?.timeSpentSeconds,
      date: data?.started,
      createdAt: data?.createdDate,
      isDeleted: false,
      organizationId: orgData.id ?? null,
    },
  };
  return formattedData;
}

async function deleteFormattedData(data: Jira.ExternalType.Webhook.Worklog, requestId: string, resourceId: string): Promise<Jira.Type.Worklog> {
  const orgData = await getOrganization(data.organization);
  if (!orgData) {
    logger.error({
      requestId: requestId,
      resourceId: resourceId,
      message: `Organization ${data.organization} not found`,
    });
    throw new Error(`Organization ${data.organization} not found`);
  }
  const reqCtx = { requestId: requestId, resourceId: resourceId };
  const worklogData = await getWorklogById(data.id, data.organization, reqCtx);
  if (!worklogData) {
    logger.error({
      requestId: requestId,
      resourceId: resourceId,
      message: `WorklogID ${data.id} not found`,
    });
    throw new Error(`WorklogID ${data.id} not found`);
  }
  logger.info({
    requestId: requestId,
    resourceId: resourceId,
    message: 'GET_WORKLOG_DATA',
    data: { worklogData },
  });
  const formattedData = {
    id: `${mappingPrefixes.worklog}_${data?.id}`,
    body: {
      id: `${mappingPrefixes.worklog}_${data?.id}`,
      isDeleted: true,
      organizationId: orgData.id ?? null,
    },
  };
  return formattedData;
}

