import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { Hit } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../constant/config';
import { ParamsMapping } from '../model/params-mapping';
import { generateUuid, searchedDataFormator } from './response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

interface FormattedIssue {
  id: string;
  key: string;
  fields: {
    project: {
      id: string;
      key: string;
    };
    labels: string[];
    summary: string;
    issuetype: {
      name: string;
    };
    priority: {
      name: string;
    };
    issueLinks: Array<{
      id: string;
      type: {
        name: string;
      };
    }>;
    assignee: { accountId: string } | null;
    reporter: { accountId: string } | null;
    creator: { accountId: string } | null;
    status: {
      name: string;
    };
    subtasks: Array<{
      id: string;
      key: string;
    }>;
    created: string;
    updated: string;
    lastViewed: string;
    isDeleted: boolean;
    deletedAt: string | null;
  };
}

/**
 * Creates an issue object based on the provided issue data.
 * @param issueData - The data used to create the issue.
 * @returns The created issue object.
 */
export function formatIssue(issueData: Other.Type.HitBody): FormattedIssue {
  return {
    id: issueData.issueId,
    key: issueData.issueKey,
    fields: {
      project: {
        id: issueData.projectId.replace(/jira_project_/g, ''),
        key: issueData.projectKey,
      },
      labels: issueData.label,
      summary: issueData.summary,
      issuetype: {
        name: issueData.issueType,
      },
      priority: {
        name: issueData.priority,
      },
      issueLinks: issueData.issuelinks,
      assignee: issueData.assigneeId
        ? {
            accountId: issueData.assigneeId.replace(/jira_user_/g, ''),
          }
        : null,
      reporter: issueData.reporterId
        ? {
            accountId: issueData.reporterId.replace(/jira_user_/g, ''),
          }
        : null,
      creator: issueData.creatorId
        ? {
            accountId: issueData.creatorId.replace(/jira_user_/g, ''),
          }
        : null,
      status: {
        name: issueData.status,
      },
      subtasks: issueData.subtasks,
      created: issueData.createdDate,
      updated: issueData.lastUpdated,
      lastViewed: issueData.lastViewed,
      isDeleted: issueData.isDeleted ?? false,
      deletedAt: issueData.deletedAt,
    },
  };
}
const dynamoDbDocClient = DynamoDbDocClient.getInstance();
async function getParentId(id: string): Promise<string> {
  const ddbRes = await dynamoDbDocClient.find(new ParamsMapping().prepareGetParams(id));

  return ddbRes?.parentId as string;
}

async function putDataToDynamoDB(pId: string, jiraId: string): Promise<void> {
  await dynamoDbDocClient.put(new ParamsMapping().preparePutParams(pId, jiraId));
}
async function parentId(id: string): Promise<string> {
  let pId: string = await getParentId(id);
  if (!pId) {
    pId = generateUuid();
    await putDataToDynamoDB(pId, id);
  }
  return pId;
}
/**
 * Creates an issue object based on the provided issue data.
 * @param issueData - The data used to create the issue.
 * @returns The created issue object.
 */
export async function formatIssueNew(
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: Pick<Hit, '_id'> & HitBody
): Promise<Jira.Type.Issue> {
  const customfield10007 = issueData.fields.customfield_10007?.[0];
  const devRca = issueData.fields.customfield_11225?.id;
  const qaRca = issueData.fields.customfield_11226?.id;
  return {
    id: await parentId(`${mappingPrefixes.issue}_${issueData.id}_${organization.id}`),
    body: {
      id: `${mappingPrefixes.issue}_${issueData.id}`,
      issueId: issueData.id,
      projectKey: issueData.fields.project.key,
      projectId: `${mappingPrefixes.project}_${issueData.fields.project.id}`,
      parent: {
        key: issueData.fields.parent?.key ?? null,
        id: issueData.fields.parent?.id
          ? `${mappingPrefixes.issue}_${issueData.fields.parent?.id}`
          : null,
      },
      issueKey: issueData.key,
      isFTP: issueData.fields.labels?.includes('FTP') ?? false,
      isFTF: issueData.fields.labels?.includes('FTF') ?? false,
      issueType: issueData.fields.issuetype.name,
      rcaData: {
        devRca: devRca ? `${mappingPrefixes.rca}_${devRca}` : null,
        qaRca: qaRca ? `${mappingPrefixes.rca}_${qaRca}` : null,
      },
      priority: issueData.fields.priority.name,
      label: issueData.fields.labels,
      summary: issueData?.fields?.summary ?? '',
      issueLinks: [], // will be added from issuelink_create events
      assigneeId: issueData.fields.assignee?.accountId
        ? `${mappingPrefixes.user}_${issueData.fields.assignee.accountId}`
        : null,
      reporterId: issueData.fields.reporter?.accountId
        ? `${mappingPrefixes.user}_${issueData.fields.reporter.accountId}`
        : null,
      creatorId: issueData.fields.creator?.accountId
        ? `${mappingPrefixes.user}_${issueData.fields.creator.accountId}`
        : null,
      status: issueData.fields.status.name,
      subtasks:
        issueData.fields.subtasks.map((subtask: { id: string; key: string }) => ({
          id: `${mappingPrefixes.issue}_${subtask.id}`,
          key: subtask.key,
        })) ?? [],
      createdDate: issueData.fields.created,
      lastUpdated: issueData.fields.updated,
      sprintId: customfield10007 ? `${mappingPrefixes.sprint}_${customfield10007.id}` : null,
      boardId: customfield10007 ? `${mappingPrefixes.board}_${customfield10007.boardId}` : null,
      isDeleted: issueData.isDeleted ?? false,
      deletedAt: issueData.deletedAt,
      organizationId: organization.id ?? null,
      fixVersion: issueData.fields.fixVersions[0]
        ? `${mappingPrefixes.version}_${issueData.fields.fixVersions[0]?.id}`
        : null,
      affectedVersion: issueData.fields.versions[0]
        ? `${mappingPrefixes.version}_${issueData.fields.versions?.[0]?.id}`
        : null,
      timeTracker: {
        estimate: issueData?.fields?.timeestimate ?? 0,
        actual: 0,
      },
      bugTimeTracker: {
        estimate: 0,
        actual: 0,
      },
    },
  };
}

export async function getBoardFromSprintId(sprintId: string | null): Promise<string | null> {
  // fetch sprint data from elastic search
  if (sprintId === null) {
    return null;
  }
  const query = esb
    .requestBodySearch()
    .query(esb.boolQuery().must(esb.termQuery('body.sprintId', sprintId)))
    .toJSON();
  const data = await esClientObj.search(Jira.Enums.IndexName.Sprint, query);
  const [sprint] = await searchedDataFormator(data);
  if (sprint) {
    const boardId = sprint.originBoardId;
    return boardId;
  }
  return null;
}

export async function formatReopenRateData(
  messageBody: Other.Type.HitBody
): Promise<Jira.Type.ReopenRate> {
  return {
    id: await parentId(
      `${mappingPrefixes.reopen_rate}_${messageBody.issueId}_${messageBody.sprintId}`
    ),
    body: {
      id: `${mappingPrefixes.reopen_rate}_${messageBody.issueId}_${messageBody.sprintId}`,
      organizationId: messageBody.organizationId,
      issueKey: messageBody.issueKey,
      projectId: messageBody.projectId,
      projectKey: messageBody.projectKey,
      boardId: messageBody.boardId,
      issueId: messageBody.id,
      sprintId: messageBody.sprintId,
      isReopen: false,
      reOpenCount: 0,
      isDeleted: messageBody.isDeleted,
      deletedAt: messageBody.deletedAt,
    },
  };
}
