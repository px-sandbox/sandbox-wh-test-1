import { Jira } from 'abstraction';
import { logger } from 'core';
import { v4 as uuid } from 'uuid';
import { JiraClient } from '../lib/jira-client';
import { getOrganization } from '../repository/organization/get-organization';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

// we dont use this class
export class CycleTimeProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Issue,
  Jira.Type.CycleTime
> {
  constructor(data: Jira.ExternalType.Webhook.Issue, requestId: string, resourceId: string) {
    super(data, requestId, resourceId);
  }

  public async processor(): Promise<Jira.Type.CycleTime> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.apiData.organization} not found`,
      });
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    const jiraId = `${mappingPrefixes.cycle_time}_${this.apiData.issue.id}_${mappingPrefixes.org}_${orgData.orgId}`;
    let parentId = await this.getParentId(jiraId);

    // if parent id is not present in dynamoDB then create a new parent id
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, jiraId);
    }
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const issueDataFromApi = await jiraClient.getIssue(this.apiData.issue.id);

    return {
      id: parentId ?? uuid(),
      body: {
        organizationId: orgData.id,
        issueId: this.apiData.issue.id,
        issueKey: this.apiData.issue.key,
        projectId: `${mappingPrefixes.project}_${this.apiData.issue.fields.project.id}`,
        projectKey: this.apiData.issue.fields.project.key,
        sprintId: 'A',
        development: {
          coding: 101010101,
          pickup: 101010101,
          review: 101010101,
          handover: 101010101,
          total: 101010101,
        },
        qa: {
          pickup: 101010101,
          testing: 101010101,
          total: 101010101,
        },
        deployment: {
          deploy: 101010101,
          total: 101010101,
        },
        assignees: [
          {
            id: 'A',
            name: 'A',
            email: 'A',
          },
        ],
        hasSubtasks: issueDataFromApi.fields.subtasks.length > 0,
        subtasks:
          {
            ...issueDataFromApi.fields.subtasks,
            development: {
              coding: 101010101,
              pickup: 101010101,
              review: 101010101,
              handover: 101010101,
              total: 101010101,
            },
          } ?? [],
        history: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    };
  }
}
