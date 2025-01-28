/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { logger } from 'core';
import { SQSClient } from '@pulse/event-handler';
import { DataProcessor } from './data-processor';
import { getOrganization } from '../repository/organization/get-organization';
import { mappingPrefixes } from '../constant/config';

export class WorklogProcessor extends DataProcessor<
  Jira.ExternalType.Webhook.Worklog,
  Jira.Type.Worklog
> {
  private sqsClient: SQSClient;
  constructor(
    data: Jira.ExternalType.Webhook.Worklog,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.Worklog, retryProcessId);
    this.sqsClient = SQSClient.getInstance();
  }

  public async process(): Promise<void> {
    await this.format();
  }

  public async format(): Promise<void> {
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.apiData.organization} not found`,
      });
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }
    this.formattedData = {
      id: await this.parentId(
        `${mappingPrefixes.worklog}_${this.apiData?.id}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        id: `${mappingPrefixes.worklog}_${this.apiData?.id}`,
        projectKey: this.apiData?.issueData.projectKey,
        issueKey: this.apiData?.issueData.issueKey,
        timeLogged: this.apiData?.timeSpentSeconds,
        category: null,
        date: this.apiData?.started,
        createdAt: this.apiData?.createdDate,
        isDeleted: this.apiData?.issueData?.isDeleted ?? false,
        organizationId: orgData.id ?? null,
      },
    };
  }

}