import { Jira } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { JiraClient } from '../lib/jira-client';
import { getOrganization } from '../repository/organization/get-organization';
import { DataProcessor } from './data-processor';

export class UserProcessor extends DataProcessor<Jira.Mapper.User, Jira.Type.User> {
  constructor(
    data: Jira.Mapper.User,
    requestId: string,
    resourceId: string,
    retryProcessId?: string
  ) {
    super(data, requestId, resourceId, Jira.Enums.IndexName.Users, retryProcessId);
  }

  public async process(): Promise<void> {
    // TODO: for now sending every event, can be optimized with switch case statement
    logger.info({ message: 'No event type found for:', data: this.eventType });
    await this.format();
  }

  public async format(): Promise<void> {
    // can be moved to parent class
    const orgData = await getOrganization(this.apiData.organization);
    if (!orgData) {
      logger.error({
        requestId: this.requestId,
        resourceId: this.resourceId,
        message: `Organization ${this.apiData.organization} not found`,
      });
      throw new Error(`Organization ${this.apiData.organization} not found`);
    }

    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const apiUserData = await jiraClient.getUser(this.apiData.accountId);

    this.formattedData = {
      id: await this.getParentId(
        `${mappingPrefixes.user}_${this.apiData.accountId}_${mappingPrefixes.org}_${orgData.orgId}`
      ),
      body: {
        id: `${mappingPrefixes.user}_${this.apiData?.accountId}`,
        userId: this.apiData?.accountId,
        userType: this.apiData?.accountType,
        emailAddress: this.apiData?.emailAddress ?? null,
        displayName: this.apiData?.displayName,
        avatarUrls: this.apiData?.avatarUrls
          ? {
              avatarUrl48x48: this.apiData?.avatarUrls['48x48'],
              avatarUrl32x32: this.apiData?.avatarUrls['32x32'],
              avatarUrl24x24: this.apiData?.avatarUrls['24x24'],
              avatarUrl16x16: this.apiData?.avatarUrls['16x16'],
            }
          : null,
        isActive: this.apiData.active,
        groups: apiUserData?.groups ?? null,
        applicationRoles: apiUserData?.applicationRoles ?? null,
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        createdAt: this.apiData.createdAt,
        organizationId: orgData.id ?? null,
      },
    };
  }
}
