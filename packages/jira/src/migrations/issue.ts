import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { Issue } from 'abstraction/jira/external/api';
import { mapLimit } from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { getSprintForTo } from '../util/prepare-reopen-rate';
import { getOrganization } from '../repository/organization/get-organization';
import { mappingPrefixes } from '../constant/config';
import { JiraClient } from '../lib/jira-client';
import { ParamsMapping } from '../model/params-mapping';

const dynamodbClient = DynamoDbDocClient.getInstance();
const sqsClient = SQSClient.getInstance();
const esClient = ElasticSearchClient.getInstance();

async function getParentId(issueId: string): Promise<string> {
  const ddbRes = await dynamodbClient.find(new ParamsMapping().prepareGetParams(issueId));
  if (ddbRes?.parentId) return ddbRes.parentId as string;

  const parentId = uuid();
  await dynamodbClient.put(new ParamsMapping().preparePutParams(parentId, issueId));

  return parentId;
}

async function getSprint(
  issue: Issue,
  jira: JiraClient
): Promise<{ sprintId: string | null; boardId: string | null | number }> {
  if (issue.fields.sprint) {
    return {
      sprintId: issue.fields.sprint.id,
      boardId: issue.fields.sprint.originBoardId,
    };
  }
  if (issue.fields.customfield_10007 && issue.fields.customfield_10007.length === 1) {
    return {
      sprintId: issue.fields.customfield_10007[0].id,
      boardId: issue.fields.customfield_10007[0].boardId,
    };
  }

  // get sprint id from the changelog

  const changeLogs = await jira.getIssueChangelogs(issue.id);
  const sprint = changeLogs
    .flatMap((d) => d.items)
    .findLast((item: any) => item.field === 'Sprint');

  let sprintId = null;

  if (sprint) {
    const toSprint = sprint.to.split(', ');

    if (toSprint.length === 1) {
      [sprintId] = toSprint;
    } else {
      sprintId = getSprintForTo(sprint.to, sprint.from);
    }

    const { originBoardId: boardId } = await jira.getSprint(sprintId as string);

    return { sprintId, boardId };
  }

  return { sprintId: null, boardId: null };
}

async function formatIssue(issue: Issue, orgId: string, jira: JiraClient): Promise<object> {
  try {
    const { sprintId, boardId } = await getSprint(issue, jira);
    const parentId = await getParentId(`${mappingPrefixes.issue}_${issue.id}`);

    return {
      _id: parentId,
      body: {
        id: `${mappingPrefixes.issue}_${issue.id}`,
        issueId: issue.id,
        projectKey: issue.fields.project.key,
        projectId: `${mappingPrefixes.project}_${issue.fields.project.id}`,
        issueKey: issue.key,
        isFTP: issue.fields.labels?.includes('FTP') ?? false,
        isFTF: issue.fields.labels?.includes('FTF') ?? false,
        issueType: issue.fields.issuetype.name,
        isPrimary: true,
        priority: issue.fields.priority.name,
        label: issue.fields.labels,
        summary: issue?.fields?.summary ?? '',
        issueLinks: issue.fields.issuelinks,
        assigneeId: issue.fields.assignee?.accountId
          ? `${mappingPrefixes.user}_${issue.fields.assignee.accountId}`
          : null,
        reporterId: issue.fields.reporter?.accountId
          ? `${mappingPrefixes.user}_${issue.fields.reporter.accountId}`
          : null,
        creatorId: issue.fields.creator?.accountId
          ? `${mappingPrefixes.user}_${issue.fields.creator.accountId}`
          : null,
        status: issue.fields.status.name,
        subtasks: issue.fields.subtasks ?? [],
        createdDate: issue.fields.created,
        lastUpdated: issue.fields.updated,
        lastViewed: issue.fields.lastViewed,
        sprintId: sprintId ? `${mappingPrefixes.sprint}_${sprintId}` : null,
        boardId: boardId ? `${mappingPrefixes.board}_${boardId}` : null,
        isDeleted: false,
        deletedAt: null,
        organizationId: orgId,
        timeTracker: {
          estimate: issue?.fields?.timetracking?.originalEstimateSeconds ?? 0,
          actual: issue?.fields?.timetracking?.timeSpentSeconds ?? 0,
        },
      },
    };
  } catch (error) {
    logger.error({
      message: 'Error in formatting issue',
      error,
      data: { issue: issue.key, error },
    });
    throw error;
  }
}

async function checkAndSave(
  organization: string,
  projectId: string,
  boardId: string,
  sprintId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const jira = await JiraClient.getClient(organization);
  const issues = await jira.getIssues(sprintId);

  logger.info({
    ...reqCtx,
    message: `
  FETCHING ISSUES FOR THIS 
  sprintId: ${sprintId}
  boardId: ${boardId}
  projectId: ${projectId}
  organization: ${organization}
  issues: ${issues.length}
  total: ${Array.from(new Set(issues.map((issue) => issue.id))).length}
  `,
  });

  const issuesToSave = await mapLimit(issues, 50, async (issue: Issue) => {
    const formattedIssue = await formatIssue(issue, orgId, jira);
    return formattedIssue;
  });

  if (issuesToSave.length > 0) {
    await esClient.bulkInsert(Jira.Enums.IndexName.Issue, issuesToSave);
  }

  const bugs = issues.filter((issue) => issue.fields.issuetype.name === Jira.Enums.IssuesTypes.BUG);

  if (bugs.length > 0) {
    logger.info({
      message: 'Reopen rate migrator',
      data: {
        sprintId,
        boardId,
        projectId,
        organization,
        bugs: bugs.map((issue) => `${issue.key} - ${issue.fields.issuetype.name}`).join(' | '),
      },
    });

    await Promise.all(
      bugs.map(async (issue) =>
        sqsClient.sendMessage(
          {
            organization,
            projectId,
            boardId,
            sprintId,
            issue,
            orgId,
          },
          Queue.qReOpenRateMigrator.queueUrl,
          reqCtx
        )
      )
    );
  }

  logger.info({ ...reqCtx, message: 'issuesMigrateDataReciever.successful' });
}

export const handler = async function issuesMigrate(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx,
        message: { organization, projectId, originBoardId, sprintId },
      } = JSON.parse(record.body);
      try {
        const org = await getOrganization(organization);
        return checkAndSave(organization, projectId, originBoardId, sprintId, org?.id, reqCtx);
      } catch (error) {
        logger.error({ ...reqCtx, message: JSON.stringify({ error, record }) });
        await logProcessToRetry(record, Queue.qIssueMigrate.queueUrl, error as Error);
        logger.error({ ...reqCtx, message: 'issueMigrateDataReciever.error', error });
      }
    })
  );
};
