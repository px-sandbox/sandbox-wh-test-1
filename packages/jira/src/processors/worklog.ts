/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { logger } from 'core';
import { getOrganization } from '../repository/organization/get-organization';
import { mappingPrefixes } from '../constant/config';

export class WorklogProcessor  {
  data: Jira.ExternalType.Webhook.Worklog;
  requestId: string;
  resourceId!: string;
  retryProcessId?: string
  formattedData!: Jira.Type.Worklog

  constructor(
    data: Jira.ExternalType.Webhook.Worklog,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    this.data = data;
    this.requestId = requestId;
    this.resourceId = resourceId;
    this.retryProcessId = retryProcessId;
  }

  public async process(): Promise<void> {
    await this.format();
  }

  public async format(): Promise<void> {
    const orgData = await getOrganization(this.data.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.data.organization} not found`,
      });
      throw new Error(`Organization ${this.data.organization} not found`);
    }
    this.formattedData = {
      id: `${mappingPrefixes.worklog}_${this.data?.id}`,
      body: {
        id: `${mappingPrefixes.worklog}_${this.data?.id}`,
        projectKey: this.data?.issueData.projectKey,
        issueKey: this.data?.issueData.issueKey,
        timeLogged: this.data?.timeSpentSeconds,
        category: null,
        date: this.data?.started,
        createdAt: this.data?.createdDate,
        isDeleted: this.data?.issueData?.isDeleted ?? false,
        organizationId: orgData.id ?? null,
      },
    };
  }

}