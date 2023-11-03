import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
import { getIssueChangelogs } from '../lib/get-issue-changelogs';
import { JiraClient } from '../lib/jira-client';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class IssueProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Issue,
  Jira.Type.Issue
> {
  constructor(data: Jira.ExternalType.Webhook.Issue) {
    super(data);
  }

  public getSprintAndBoardId(issue: Jira.ExternalType.Api.Issue): { sprintId: string | null, boardId: string | null } {
    const sprint = issue.fields?.customfield_10007 && issue.fields.customfield_10007[0];
    return sprint ? {
      sprintId: `${mappingPrefixes.sprint}_${sprint.id}`, boardId: `${mappingPrefixes.board}_${sprint.boardId}`
    } : { sprintId: null, boardId: null };
  }

  public async processor(): Promise<Jira.Type.Issue> {
    const [orgData] = await this.getOrganizationId(this.apiData.organization);
    const parentId: string | undefined = await this.getParentId(
      `${mappingPrefixes.issue}_${this.apiData.issue.id}_${mappingPrefixes.org}_${orgData.orgId}`
    );
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const issueDataFromApi = await jiraClient.getIssue(this.apiData.issue.id);
    const changelogArr = await getIssueChangelogs(this.apiData.organization, this.apiData.issue.id, jiraClient);
    let reOpenCount = 0;
    let changelogItems: Array<ChangelogItem> = [];
    if (changelogArr.length > 0) {
      changelogItems = changelogArr.flatMap((changelog) => changelog.items);
      reOpenCount = changelogItems.filter(
        (items) => items.to === '11905' || items.toString === 'QA Failed'
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
        changelog: changelogItems,
      },
    };
    return issueObj;
  }
}
