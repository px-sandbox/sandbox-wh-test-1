import { Jira } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class UserProcessor extends DataProcessor<Jira.ExternalType.Webhook.User, Jira.Type.User> {
  constructor(data: Jira.ExternalType.Webhook.User) {
    super(data);
  }
  public async processor(): Promise<Jira.Type.User> {
    const parentId = await this.getParentId(
      `${mappingPrefixes.user}_${this.jiraApiData.accountId}`
    );
    const orgData = await this.getOrganizationId(this.jiraApiData.organization);
    const userObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.user}_${this.jiraApiData?.accountId}`,
        jiraUserId: this.jiraApiData?.accountId,
        emailAddress: this.jiraApiData?.emailAddress || null,
        userName: this.jiraApiData?.username || null,
        displayName: this.jiraApiData?.displayName,
        avatarUrls: this.jiraApiData?.avatarUrls
          ? {
              avatarUrl48x48: this.jiraApiData?.avatarUrls['48x48'],
              avatarUrl32x32: this.jiraApiData?.avatarUrls['32x32'],
              avatarUrl24x24: this.jiraApiData?.avatarUrls['24x24'],
              avatarUrl16x16: this.jiraApiData?.avatarUrls['16x16'],
            }
          : null,
        isActive: this.jiraApiData.active,
        isDeleted: !!this.jiraApiData.isDeleted,
        deletedAt: this.jiraApiData?.deletedAt || null,
        createdAt: this.jiraApiData.createdAt,
        organizationId: orgData.body.id ?? null,
      },
    };
    return userObj;
  }
}
