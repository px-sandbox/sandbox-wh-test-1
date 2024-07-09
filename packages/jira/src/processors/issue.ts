/* eslint-disable max-lines-per-function */
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { filterIssueChangelogs } from '../lib/get-issue-changelogs';
import { mappingPrefixes } from '../constant/config';
import { JiraClient } from '../lib/jira-client';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';
import { ChangelogField } from 'abstraction/jira/enums';
import { getSprintForTo } from 'src/util/prepare-reopen-rate';

const sqsClient = SQSClient.getInstance();
export class IssueProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Issue,
  Jira.Type.Issue
> {
  constructor(data: Jira.ExternalType.Webhook.Issue, requestId: string, resourceId: string) {
    super(data, requestId, resourceId);
  }

  public validateIssueForProjects(): boolean {
    const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
    logger.info({
      requestId: this.requestId,
      resourceId: this.resourceId,
      message: 'inside validate of processor',
    });
    if (this.apiData !== undefined && projectKeys.includes(this.apiData.issue.fields.project.key)) {
      return true;
    }
    logger.info({
      requestId: this.requestId,
      resourceId: this.resourceId,
      message: 'ProjectKey not in available keys for this issue',
      data: { ProjectKey: this.apiData.issue.fields.project.key, issueKey: this.apiData.issue.key },
    });
    return false;
  }

  private getSprintAndBoardId(data: Jira.ExternalType.Webhook.Issue): {
    sprintId: string | null;
    boardId: string | null;
  } {
    let sprintId: number | null;
    let boardId: number | null;
    const [sprintChangelog] = data.changelog.items.filter(
      (item) => item.fieldId === ChangelogField.SPRINT
    );
    sprintId =
      Number(
        sprintChangelog
          ? getSprintForTo(sprintChangelog.from, sprintChangelog.to)
          : data.issue.fields.customfield_10007?.[0]?.id
      ) ?? null;

    boardId =
      data.issue.fields.customfield_10007?.find((item) => item.id == Number(sprintId))?.boardId ??
      null;

    return {
      sprintId: `${mappingPrefixes.sprint}_${sprintId}`,
      boardId: `${mappingPrefixes.board}_${boardId}`,
    };
  }

  // eslint-disable-next-line complexity
  public async processor(): Promise<Jira.Type.Issue> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.apiData.organization} not found`,
      });
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    const jiraId = `${mappingPrefixes.issue}_${this.apiData.issue.id}_${mappingPrefixes.org}_${orgData.orgId}`;
    let parentId: string | undefined = await this.getParentId(jiraId);

    if (!parentId && this.apiData.eventName === Jira.Enums.Event.IssueUpdated) {
      throw new Error(`issue_not_found_for_update_event: id:${jiraId}`);
    }
    // if parent id is not present in dynamoDB then create a new parent id
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, jiraId);
    }
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const issueDataFromApi = await jiraClient.getIssue(this.apiData.issue.id);
    // sending parent issue to issue format queue so that it gets updated along with it's subtask
    if (issueDataFromApi?.fields?.parent) {
      const parentIssueData = await jiraClient.getIssue(issueDataFromApi.fields.parent.key);
      await sqsClient.sendFifoMessage(
        {
          organization: this?.apiData?.organization ?? '',
          issue: parentIssueData,
          eventName: Jira.Enums.Event.IssueUpdated,
        },
        Queue.qIssueFormat.queueUrl,
        { requestId: this.requestId, resourceId: this.resourceId },
        issueDataFromApi.key,
        uuid()
      );
    }
    const issueObj = {
      id: parentId ?? uuid(),
      body: {
        id: `${mappingPrefixes.issue}_${this.apiData.issue.id}`,
        issueId: this.apiData.issue.id,
        projectKey: this.apiData.issue.fields.project.key,
        projectId: `${mappingPrefixes.project}_${this.apiData.issue.fields.project.id}`,
        issueKey: this.apiData.issue.key,
        isFTP: issueDataFromApi.fields.labels?.includes('FTP') ?? false,
        isFTF: issueDataFromApi.fields.labels?.includes('FTF') ?? false,
        issueType: this.apiData.issue.fields.issuetype.name,
        isPrimary: true,
        priority: this.apiData.issue.fields.priority.name,
        label: issueDataFromApi.fields.labels,
        summary: issueDataFromApi?.fields?.summary ?? '',
        issueLinks: issueDataFromApi.fields.issuelinks,
        assigneeId: this.apiData.issue.fields.assignee?.accountId
          ? `${mappingPrefixes.user}_${this.apiData.issue.fields.assignee.accountId}`
          : null,
        reporterId: this.apiData.issue.fields.reporter?.accountId
          ? `${mappingPrefixes.user}_${this.apiData.issue.fields.reporter.accountId}`
          : null,
        creatorId: this.apiData.issue.fields.creator?.accountId
          ? `${mappingPrefixes.user}_${this.apiData.issue.fields.creator.accountId}`
          : null,
        status: this.apiData.issue.fields.status.name,
        subtasks: issueDataFromApi.fields.subtasks ?? [],
        createdDate: this.apiData.issue.fields.created,
        lastUpdated: this.apiData.issue.fields.updated,
        lastViewed: this.apiData.issue.fields.lastViewed,
        ...this.getSprintAndBoardId(this.apiData),
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.id,
        timeTracker: {
          estimate: issueDataFromApi?.fields?.timetracking?.originalEstimateSeconds ?? 0,
          actual: issueDataFromApi?.fields?.timetracking?.timeSpentSeconds ?? 0,
        },
      },
    };
    return issueObj;
  }
}
