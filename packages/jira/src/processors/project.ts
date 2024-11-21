import { Jira } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class ProjectProcessor extends DataProcessor<Jira.Mapped.Project, Jira.Type.Project> {
  constructor(
    data: Jira.Mapped.Project,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.Project, retryProcessId);
  }

  /**
   * Processes the Jira project data and returns the processed data.
   * @returns The processed Jira project data.
   */
  public async process(): Promise<void> {
    switch (this.eventType) {
      case Jira.Enums.Event.ProjectCreated:
        await this.format();
        break;
    }
  }

  public async format(): Promise<void> {
    //can be moved to parent class    const orgData = await getOrganization(this.apiData.organization);
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
        `${mappingPrefixes.project}_${this.apiData.id}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        id: `${mappingPrefixes.project}_${this.apiData?.id}`,
        projectId: this.apiData?.id.toString(),
        key: this.apiData?.key,
        name: this.apiData?.name,
        avatarUrls: this.apiData?.avatarUrls
          ? {
              avatarUrl48x48: this.apiData?.avatarUrls['48x48'],
              avatarUrl32x32: this.apiData?.avatarUrls['32x32'],
              avatarUrl24x24: this.apiData?.avatarUrls['24x24'],
              avatarUrl16x16: this.apiData?.avatarUrls['16x16'],
            }
          : null,
        lead: {
          accountId: `${mappingPrefixes.user}_${this.apiData?.lead?.accountId}`,
          displayName: this.apiData?.lead?.displayName,
          active: this.apiData?.lead?.active,
          timeZone: this.apiData?.lead?.timeZone,
          accountType: this.apiData?.lead?.accountType,
          avatarUrls: this.apiData?.avatarUrls
            ? {
                avatarUrl48x48: this.apiData?.avatarUrls['48x48'],
                avatarUrl32x32: this.apiData?.avatarUrls['32x32'],
                avatarUrl24x24: this.apiData?.avatarUrls['24x24'],
                avatarUrl16x16: this.apiData?.avatarUrls['16x16'],
              }
            : null,
        },
        organizationId: orgData.id ?? null,
        assigneeType: this.apiData?.assigneeType,
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        updatedAt: this.apiData?.updatedAt ?? null,
        createdAt: this.apiData?.createdAt ?? null,
      },
    };
  }
}
