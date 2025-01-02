import { Jira } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class ReopenRateProcessor extends DataProcessor<
  Jira.Mapped.ReopenRateIssue,
  Jira.Type.ReopenRate
> {
  constructor(
    data: Jira.Mapped.ReopenRateIssue,
    requestId: string,
    resourceId: string,
    retryProcessId: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.ReopenRate, retryProcessId);
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
        `${mappingPrefixes.reopen_rate}_${this.apiData.issue.id}_${mappingPrefixes.sprint}_${this.apiData.sprintId}
        _${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        // eslint-disable-next-line max-len
        id: `${mappingPrefixes.reopen_rate}_${this.apiData.issue.id}_${mappingPrefixes.sprint}_${this.apiData.sprintId}`,
        sprintId: `${mappingPrefixes.sprint}_${this.apiData.sprintId}`,
        projectId: `${mappingPrefixes.project}_${this.apiData.issue.fields.project.id}`,
        projectKey: this.apiData.issue.fields.project.key,
        issueId: `${mappingPrefixes.issue}_${this.apiData.issue.id}`,
        issueKey: this.apiData.issue.key,
        reOpenCount: this.apiData.reOpenCount ?? 0,
        isReopen: !!this.apiData.reOpenCount,
        organizationId: `${mappingPrefixes.organization}_${orgData.orgId}`,
        isDeleted: false,
        deletedAt: null,
      },
    };
  }
}
