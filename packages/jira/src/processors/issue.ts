import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';
import { JiraClient } from 'src/lib/jira-client';

export class IssueProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Issue,
  Jira.Type.Issue
> {
  constructor(data: Jira.ExternalType.Webhook.Issue) {
    super(data);
  }

  public async processor(): Promise<Jira.Type.Issue> {
    const parentId: string | undefined = await this.getParentId(
      `${mappingPrefixes.issue}_${this.apiData.id}`
    );
    const orgData = await this.getOrganizationId(this.apiData.organization);
    // const jiraClient = await JiraClient.getClient(this.apiData.organization);
    console.log(this.apiData.fields.labels);
    // const data  = this.apiData.fields.labels?.map((label) => { if (label === 'FTP') return {FTP: label}});
    // console.log(data);
    const issueObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.issue}_${this.apiData.id}`,
        issueId: `${this.apiData.id}`,
        projectKey: this.apiData.fields.project.key,
        projectId: this.apiData.fields.project.id,
        issueKey: this.apiData.key,
        isFTP: this.apiData.fields.labels?.includes('FTP') ?? false,
        isFTF: this.apiData.fields.labels?.includes('FTF') ?? false,
        reOpenCount: 0,
        issueType: this.apiData.fields.issuetype.name,
        isPrimary: true,
        priority: this.apiData.fields.priority.name,
        label: this.apiData.fields.labels,
        issueLinks: this.apiData.fields.issuelinks,
        assigneeId: this.apiData.fields.assignee?.accountId,
        reporterId: this.apiData.fields.reporter?.accountId,
        creatorId: this.apiData.fields.creator?.accountId,
        status: this.apiData.fields.status.name,
        subtasks: this.apiData.fields.subtasks,
        createdDate: this.apiData.fields.created,
        lastUpdated: this.apiData.fields.updated,
        lastViewed:this.apiData.fields.lastViewed,
        sprintId: '',
        isDeleted: this.apiData.isDeleted ?? false,
        deletedAt: this.apiData.deletedAt ?? null,
        organizationId: orgData.body.id
      },
    };
    return issueObj;
  }
}
