import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Jira } from 'abstraction';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { HitBody, Hit } from 'abstraction/other/type';
import { IssuesTypes } from 'abstraction/jira/enums';
import { Subtasks } from 'abstraction/jira/external/api';
import { MainTicket } from '../../../lib/issue/main-ticket';
import { getOrganization } from '../../../repository/organization/get-organization';
import { searchedDataFormator } from '../../../util/response-formatter';
import { initializeMapping } from '../../../util/cycle-time-subtasks';
import { mappingPrefixes } from '../../../constant/config';
import { saveCycleTime } from '../../../repository/issue/save-cycle-time';

const esClientObj = ElasticSearchClient.getInstance();

function cycleTimeQuery(issueId: string, organization: string): Record<string, any> {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.issueId', issueId),
          esb.termQuery('body.organization', organization),
        ])
    )
    .toJSON();
}

async function getDataFromEsb(
  issueId: string,
  orgId: string
): Promise<(Pick<Hit, '_id'> & HitBody)[]> {
  const cycleTimeEsb = esClientObj.search(
    Jira.Enums.IndexName.CycleTime,
    cycleTimeQuery(issueId, orgId)
  );
  const cycleTimeData = await searchedDataFormator(cycleTimeEsb);
  return cycleTimeData;
}

function formatSubtask(data: Record<string, string>[]): Subtasks[] {
  return data.map((subtask: any) => ({
    issueId: subtask.id,
    title: subtask.fields.summary,
    assignees: subtask.fields.assignee,
    issueKey: subtask.key,
  }));
}

function formatCycleTimeData(
  data: Jira.ExternalType.Webhook.Issue,
  orgId: string
): Jira.Type.FormatCycleTime {
  const isSubtask = data.issue.fields.issuetype.subtask;
  let subtasks: Subtasks[] = [];
  if (isSubtask) {
    subtasks = formatSubtask(data.issue.fields.subtasks);
  }
  return {
    issueId: data.issue.id,
    sprintId: String(data.issue.fields.customfield_10007[0].id),
    subtasks,
    orgId,
    issueType: data.issue.fields.issuetype.name,
    projectId: data.issue.fields.project.id,
    projectKey: data.issue.fields.project.key,
    assignee: data.issue.fields?.assignee ?? [],
    title: data.issue.fields?.summary ?? '',
    issueKey: data.issue.key,
    changelog: {
      ...data.changelog,
      timestamp: data.timestamp,
      issuetype: data.issue.fields.issuetype.name,
      issueId: data.issue.id,
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
        if (['PT', 'PX'].includes(projectKey)) {
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
          let mainTicketData = formattedData;
          const orgId = `${mappingPrefixes.organization}_${orgData.orgId}`;
          const statusMapping = await initializeMapping(orgId);

          const reverseMapping = Object.entries(statusMapping).reduce((acc, [key, value]) => {
            acc[value] = key;
            return acc;
          }, {});

          logger.info({
            message: 'CYCLE_TIME_SQS_RECEIVER_HANDLER',
            data: JSON.stringify(mainTicketData),
            requestId,
            resourceId,
          });
          if (dataFromEsb.length > 0) {
            mainTicketData = dataFromEsb[0].body;
          }
          const mainTicket = new MainTicket(mainTicketData, statusMapping, reverseMapping);
          if (mainTicketData.issueType === IssuesTypes.SUBTASK) {
            mainTicket.addSubtask(messageBody);
          }
          if (formattedData.changelog && formattedData.changelog.items) {
            mainTicket.changelog(formattedData.changelog);
          }
          const cycleTimeData = mainTicket.toJSON();
          await saveCycleTime(cycleTimeData, { requestId, resourceId });
          logger.info({
            message: 'CYCLE_TIME_SQS_RECEIVER_HANDLER',
            data: cycleTimeData,
            requestId,
            resourceId,
          });
        }
      } catch (error) {
        logger.error({
          message: 'cycleTimeFormattedDataReceiver.error',
          error,
          requestId,
          resourceId,
        });
      }
    })
  );
};
