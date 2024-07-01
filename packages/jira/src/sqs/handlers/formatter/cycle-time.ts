import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { Subtasks } from 'abstraction/jira/external/api';
import { Hit, HitBody } from 'abstraction/other/type';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../../../constant/config';
import { MainTicket } from '../../../lib/issue/main-ticket';
import { getOrganization } from '../../../repository/organization/get-organization';
import { initializeMapping } from '../../../util/cycle-time';
import { searchedDataFormator } from '../../../util/response-formatter';
import { saveCycleTime } from '../../../repository/cycle-time/save-cycle-time';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';

const esClientObj = ElasticSearchClient.getInstance();

function cycleTimeQuery(issueId: string, organization: string): Record<string, any> {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.id', issueId),
          esb.termQuery('body.organizationId', organization),
        ])
    )
    .toJSON();
}

async function getDataFromEsb(
  issueId: string,
  orgId: string
): Promise<(Pick<Hit, '_id'> & HitBody)[]> {
  const id = `${mappingPrefixes.issue}_${issueId}`;
  const organizationId = `${mappingPrefixes.organization}_${orgId}`;
  const cycleTimeEsb = await esClientObj.search(
    Jira.Enums.IndexName.CycleTime,
    cycleTimeQuery(id, organizationId)
  );
  const cycleTimeData = await searchedDataFormator(cycleTimeEsb);
  return cycleTimeData;
}

function formatSubtask(data: any): Subtasks {
  return {
    issueId: `${mappingPrefixes.issue}_${data.id}`,
    title: data.fields.summary,
    assignees: data.fields.assignee,
    issueKey: data.key,
  };
}

function formatCycleTimeData(
  data: Jira.ExternalType.Webhook.Issue,
  orgId: string
): Jira.Type.FormatCycleTime {
  const isSubtask = data.issue.fields.issuetype.subtask;
  const subtasks: Subtasks[] = [];
  if (isSubtask) {
    const subtaskArr = data.issue.fields.subtasks;
    subtaskArr.forEach((subtask) => {
      subtasks.push(formatSubtask(subtask));
    });
  }
  return {
    issueId: `${mappingPrefixes.issue}_${data.issue.id}`,
    sprintId: `${mappingPrefixes.sprint}_${data.issue.fields.customfield_10007[0].id}`,
    organizationId: `${mappingPrefixes.organization}_${orgId}`,
    subtasks,
    issueType: data.issue.fields.issuetype.name,
    projectId: `${mappingPrefixes.project}_${data.issue.fields.project.id}`,
    projectKey: data.issue.fields.project.key,
    assignee: data.issue.fields?.assignee
      ? {
          assigneeId: data.issue.fields?.assignee.accountId,
          name: data.issue.fields?.assignee.displayName,
        }
      : [],
    title: data.issue.fields?.summary ?? '',
    issueKey: data.issue.key,
    changelog: {
      ...data.changelog,
      timestamp: data.issue.fields.updated,
      issuetype: data.issue.fields.issuetype.name,
      issueId: `${mappingPrefixes.issue}_${data.issue.id}`,
    },
  };
}

export const handler = async function cycleTimeFormattedDataReciever(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          message: 'CYCLE_TIME_SQS_RECEIVER_HANDLER',
          data: messageBody,
          requestId,
          resourceId,
        });
        throw new Error('intentional_error_for_cycle_time');
        const orgData = await getOrganization(messageBody.organization);
        if (!orgData) {
          logger.error({
            requestId,
            message: `Organization ${messageBody.orgName} not found`,
          });
          throw new Error(`Organization ${messageBody.orgName} not found`);
        }
        const projectKey = messageBody.issue.fields.project.key;
        logger.info({ message: 'projectKey', data: projectKey, requestId, resourceId });
        if (['PT', 'PX', 'FUZE', 'YT100'].includes(projectKey)) {
          const issueType = messageBody.issue.fields.issuetype.name;
          let issueId = messageBody.issue.id;
          if (issueType === IssuesTypes.SUBTASK) {
            issueId = messageBody.issue.fields.parent.id;
          }
          if (issueId === undefined) {
            logger.error({ message: 'issueId is not defined', requestId, resourceId });
            return;
          }
          const dataFromEsb = await getDataFromEsb(issueId, orgData.orgId);
          if (issueType === IssuesTypes.SUBTASK && dataFromEsb.length === 0) {
            logger.error({
              message: 'Parent issue not found in cycle time data',
              data: { id: messageBody.issue.id },
              requestId,
              resourceId,
            });
            return;
          }
          const formattedData = formatCycleTimeData(messageBody, orgData.orgId);
          let mainTicketData: Jira.Type.FormatCycleTime;
          const orgId = `${mappingPrefixes.organization}_${orgData.orgId}`;
          const statusMapping = await initializeMapping(orgId);

          const reverseMapping = Object.entries(statusMapping).reduce(
            (acc: Record<string, any>, [key, value]) => {
              acc[value] = { label: key, id: value };
              return acc;
            },
            {}
          );
          if (dataFromEsb.length > 0) {
            const ticketData = dataFromEsb[0];
            mainTicketData = ticketData;
          } else {
            mainTicketData = formattedData;
          }

          logger.info({
            message: 'CYCLE_TIME_SQS_RECEIVER_HANDLER',
            data: JSON.stringify(mainTicketData),
            requestId,
            resourceId,
          });

          const mainTicket = new MainTicket(mainTicketData, statusMapping, reverseMapping);
          if (issueType === IssuesTypes.SUBTASK) {
            mainTicket.addSubtask(formatSubtask(messageBody.issue));
          }

          if (formattedData.changelog && formattedData.changelog.items) {
            mainTicket.changelog(formattedData.changelog);
          }
          const cycleTimeData = mainTicket.toJSON();
          await saveCycleTime(cycleTimeData, { requestId, resourceId }, messageBody.processId);
          logger.info({
            message: 'CYCLE_TIME_SQS_RECEIVER_HANDLER',
            data: cycleTimeData,
            requestId,
            resourceId,
          });
        } else {
          logger.info({
            message: 'Project key not allowed',
            data: { projectKey },
            requestId,
            resourceId,
          });
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.qCycleTimeFormat.queueUrl, error as Error);
        logger.error({
          message: 'cycleTimeFormattedDataReceiver.error',
          error: `${error}`,
          requestId,
          resourceId,
        });
      }
    })
  );
};
