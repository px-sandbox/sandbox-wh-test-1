import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { Subtasks } from 'abstraction/jira/external/api';
import { Hit, HitBody } from 'abstraction/other/type';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../../../constant/config';
import { MainTicket } from '../../../lib/issue/main-ticket';
import { saveCycleTime } from '../../../repository/cycle-time/save-cycle-time';
import { getOrganization } from '../../../repository/organization/get-organization';
import { initializeMapping } from '../../../util/cycle-time';
import { searchedDataFormator } from '../../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

function cycleTimeQuery(issueId: string, organization: string): {
  query: {
    bool: {
      must: {
        term: Record<string, string>;
      }[];
    };
  };
} {
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
  const id = `${mappingPrefixes.cycleTime}_${issueId}`;
  const organizationId = `${mappingPrefixes.organization}_${orgId}`;
  const cycleTimeEsb = await esClientObj.search(
    Jira.Enums.IndexName.CycleTime,
    cycleTimeQuery(id, organizationId)
  );
  const cycleTimeData = await searchedDataFormator(cycleTimeEsb);
  return cycleTimeData;
}

function formatSubtask(data: {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: {
      name: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
    };
  };
}): Subtasks {
  return {
    issueId: `${mappingPrefixes.issue}_${data.id}`,
    title: data.fields.summary,
    assignees: data.fields.assignee
      ? [{ assigneeId: data.fields.assignee.accountId, name: data.fields.assignee.displayName }]
      : [],
    issueKey: data.key,
    issueType: data.fields.issuetype.name,
  };
}

function formatCycleTimeData(
  data: Jira.ExternalType.Webhook.Issue,
  changelog: Jira.ExternalType.Webhook.ChangelogItem[],
  orgId: string
): Jira.Type.FormatCycleTime {
  const isSubtask = data.fields.issuetype.subtask;
  const subtasks: Subtasks[] = [];
  if (isSubtask) {
    const subtaskArr = data.fields.subtasks;
    subtaskArr.forEach((subtask) => {
      subtasks.push(formatSubtask(subtask));
    });
  }
  return {
    issueId: `${mappingPrefixes.issue}_${data.id}`,
    sprintId: data.fields.customfield_10007
      ? `${mappingPrefixes.sprint}_${data.fields.customfield_10007[0].id}`
      : `${mappingPrefixes.sprint}_null`,
    organizationId: `${mappingPrefixes.organization}_${orgId}`,
    subtasks,
    issueType: data.fields.issuetype.name,
    projectId: `${mappingPrefixes.project}_${data.fields.project.id}`,
    projectKey: data.fields.project.key,
    assignees: data.fields?.assignee
      ? [
          {
            assigneeId: data.fields?.assignee.accountId,
            name: data.fields?.assignee.displayName,
          },
        ]
      : [],
    title: data.fields?.summary ?? '',
    issueKey: data.key,
    changelog: {
      id: `${mappingPrefixes.issue}_${data.id}`,
      items: changelog.map(item => ({
        field: item.field,
        fieldId: item.fieldId || item.field,
        fieldtype: item.fieldtype || 'jira',
        from: item.from,
        fromString: item.fromString,
        to: item.to,
        toString: item.toString
      })),
      timestamp: data.fields.updated,
      issuetype: data.fields.issuetype.name as IssuesTypes,
      issueId: `${mappingPrefixes.issue}_${data.id}`,
    },
    fixVersion: data.fields.fixVersions[0]
      ? `${mappingPrefixes.version}_${data.fields.fixVersions[0].id}`
      : null,
    affectedVersion: data.fields.versions[0]
      ? `${mappingPrefixes.version}_${data.fields.versions[0].id}`
      : null,
    isDeleted: false,
    deletedAt: null,
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
        const { issue, changelog } = messageBody;
        const formattedData = await formatCycleTimeData(issue, changelog, orgData.orgId);
        let mainTicketData: Jira.Type.FormatCycleTime;
        const orgId = `${mappingPrefixes.organization}_${orgData.orgId}`;
        const statusMapping = await initializeMapping(orgId);

        const reverseMapping = Object.entries(statusMapping).reduce(
          (acc: Record<string, { label: string; id: string }>, [key, value]) => {
            acc[value] = { label: key, id: value };
            return acc;
          },
          {}
        );
        if (dataFromEsb.length > 0) {
          const ticketData = dataFromEsb[0];
          mainTicketData = {
            ...formattedData,
            ...ticketData.body
          };
        } else {
          mainTicketData = formattedData;
        }

        logger.info({
          message: 'CYCLE_TIME_SQS_RECEIVER_HANDLER-FORMATTED',
          data: JSON.stringify(mainTicketData),
          requestId,
          resourceId,
        });

        const mainTicket = new MainTicket(mainTicketData as Jira.Type.FormatCycleTime, statusMapping, reverseMapping);
        if (issueType === IssuesTypes.SUBTASK) {
          mainTicket.addSubtask(formatSubtask(messageBody.issue));
        }

        if (formattedData.changelog && formattedData.changelog.items) {
          mainTicket.changelog(formattedData.changelog);
        }
        const cycleTimeData = mainTicket.toJSON();
        await saveCycleTime(cycleTimeData, { requestId, resourceId }, messageBody.processId);
        logger.info({
          message: 'CYCLE_TIME_SQS_HANDLER_AFTER_SAVE',
          data: cycleTimeData,
          requestId,
          resourceId,
        });
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
