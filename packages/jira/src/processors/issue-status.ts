import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class IssueStatusProcessor extends DataProcessor<
  Jira.ExternalType.Api.IssueStatus,
  Jira.Type.IssueStatus
> {
  constructor(
    data: Jira.ExternalType.Api.IssueStatus,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.IssueStatus, retryProcessId);
  }

  // eslint-disable-next-line complexity
  public async process(): Promise<void> {
    switch (this.eventType) {
      case Jira.Enums.Event.IssueCreated:
        await this.format();
        break;
    }
  }

  public async format(): Promise<void> {
    //can be moved to parent class
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
      id: await this.getParentId(
        `${mappingPrefixes.issueStatus}_${this.apiData.id}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        id: `${mappingPrefixes.issueStatus}_${this.apiData.id}`,
        issueStatusId: this.apiData.id,
        name: this.apiData.name,
        status: this.apiData.statusCategory,
        organizationId: orgData.id,
        pxStatus: null,
      },
    };
  }
}
