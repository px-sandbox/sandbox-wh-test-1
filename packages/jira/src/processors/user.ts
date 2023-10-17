import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { JiraClient } from '../lib/jira-client';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';


export class UserProcessor extends DataProcessor<Jira.Mapper.User, Jira.Type.User> {
  constructor(data: Jira.Mapper.User) {
    super(data);
  }
  public async processor(): Promise<Jira.Type.User> {
    const [orgData] = await this.getOrganizationId(this.apiData.organization);
    const parentId = await this.getParentId(
      `${mappingPrefixes.user}_${this.apiData.accountId}_${mappingPrefixes.org}_${orgData.orgId}`
    );
    const jiraClient = await JiraClient.getClient(this.apiData.organization);
    const apiUserData = await jiraClient.getUser(this.apiData.accountId);
    const userObj = {
      id: parentId || uuid(),
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
    return userObj;
  }
}
