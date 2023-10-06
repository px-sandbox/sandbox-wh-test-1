import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
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

  public async processor(): Promise<Jira.Type.Issue> {
    const parentId: string | undefined = await this.getParentId(
      `${mappingPrefixes.issue}_${this.apiData.issue.id}`
    );
    const orgData = await this.getOrganizationId(this.apiData.organization);
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const issue = await jiraClient.getIssue(this.apiData.issue.id);
    const changelogItems: Array<ChangelogItem> = this.apiData.changelog.items.map((item) => item);
    const reOpenCount: number = changelogItems.filter(
      (items) => items.to == '10036' || items.toString == 'QA Failed'
    ).length;

    const issueObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.issue}_${this.apiData.issue.id}`,
        issueId: `${this.apiData.issue.id}`,
        projectKey: this.apiData.issue.fields.project.key,
        projectId: this.apiData.issue.fields.project.id,
        issueKey: this.apiData.issue.key,
        isFTP: this.apiData.issue.fields.labels?.includes('FTP') ?? false,
        isFTF: this.apiData.issue.fields.labels?.includes('FTF') ?? false,
        reOpenCount: reOpenCount ?? 0,
        issueType: this.apiData.issue.fields.issuetype.name,
        isPrimary: true,
        priority: this.apiData.issue.fields.priority.name,
        label: this.apiData.issue.fields.labels,
        issueLinks: this.apiData.issue.fields.issuelinks,
        assigneeId: this.apiData.issue.fields.assignee?.accountId ?? null,
        reporterId: this.apiData.issue.fields.reporter?.accountId ?? null,
        creatorId: this.apiData.issue.fields.creator?.accountId ?? null,
        status: this.apiData.issue.fields.status.name,
        subtasks: this.apiData.issue.fields.subtasks,
        createdDate: this.apiData.issue.fields.created,
        lastUpdated: this.apiData.issue.fields.updated,
        lastViewed: this.apiData.issue.fields.lastViewed,
        sprintId: `${mappingPrefixes.issue}_${issue.fields?.sprint.id}` ?? null,
        boardId: issue.fields?.sprint.originBoardId ?? null,
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.body.id,
        changelog: { id: this.apiData.changelog.id, items: changelogItems } ?? null,
      },
    };
    return issueObj;
  }
}
