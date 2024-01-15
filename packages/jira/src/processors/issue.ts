import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
import { Config } from 'sst/node/config';
import { getFailedStatusDetails } from '../util/issue-status';
import { getIssueChangelogs } from '../lib/get-issue-changelogs';
import { JiraClient } from '../lib/jira-client';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class IssueProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Issue,
  Jira.Type.Issue
> {
  constructor(data: Jira.ExternalType.Webhook.Issue) {
    super(data);
  }

  public validate(): false | this {
    const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
    if (this.apiData !== undefined && projectKeys.includes(this.apiData.issue.fields.project.key)) {
      return this;
    }
    logger.info({ message: 'EMPTY_DATA or projectKey not in available keys for this issue', data: this.apiData })
    return false;
  }

  public getSprintAndBoardId(issue: Jira.ExternalType.Api.Issue): { sprintId: string | null, boardId: string | null } {
    const sprint = issue.fields?.customfield_10007 && issue.fields.customfield_10007[0];
    return sprint ? {
      sprintId: `${mappingPrefixes.sprint}_${sprint.id}`, boardId: `${mappingPrefixes.board}_${sprint.boardId}`
    } : { sprintId: null, boardId: null };
  }

  // eslint-disable-next-line complexity
  public async processor(): Promise<Jira.Type.Issue> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error(`Organization ${this.apiData.organization} not found`);
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    const parentId: string | undefined = await this.getParentId(
      `${mappingPrefixes.issue}_${this.apiData.issue.id}_${mappingPrefixes.org}_${orgData.orgId}`
    );
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const issueDataFromApi = await jiraClient.getIssue(this.apiData.issue.id);
    const changelogArr = await getIssueChangelogs(this.apiData.issue.id, jiraClient);
    let reOpenCount = 0;
    const QaFailed = await getFailedStatusDetails(orgData.id);
    if (changelogArr.length > 0) {
      reOpenCount = changelogArr.filter(
        (items) => items.to === QaFailed.issueStatusId && items.toString === QaFailed.name
      ).length;
    }
    const issueObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.issue}_${this.apiData.issue.id}`,
        issueId: this.apiData.issue.id,
        projectKey: this.apiData.issue.fields.project.key,
        projectId: `${mappingPrefixes.project}_${this.apiData.issue.fields.project.id}`,
        issueKey: this.apiData.issue.key,
        isFTP: this.apiData.issue.fields.labels?.includes('FTP') ?? false,
        isFTF: this.apiData.issue.fields.labels?.includes('FTF') ?? false,
        reOpenCount,
        issueType: this.apiData.issue.fields.issuetype.name,
        isPrimary: true,
        priority: this.apiData.issue.fields.priority.name,
        label: this.apiData.issue.fields.labels,
        issueLinks: this.apiData.issue.fields.issuelinks,
        assigneeId: this.apiData.issue.fields.assignee?.accountId ?
          `${mappingPrefixes.user}_${this.apiData.issue.fields.assignee.accountId}` : null,
        reporterId: this.apiData.issue.fields.reporter?.accountId ?
          `${mappingPrefixes.user}_${this.apiData.issue.fields.reporter.accountId}` : null,
        creatorId: this.apiData.issue.fields.creator?.accountId ?
          `${mappingPrefixes.user}_${this.apiData.issue.fields.creator.accountId}` : null,
        status: this.apiData.issue.fields.status.name,
        subtasks: this.apiData.issue.fields.subtasks,
        createdDate: this.apiData.issue.fields.created,
        lastUpdated: this.apiData.issue.fields.updated,
        lastViewed: this.apiData.issue.fields.lastViewed,
        ...this.getSprintAndBoardId(issueDataFromApi),
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.id,
        changelog: changelogArr,
      },
    };
    return issueObj;
  }

}
