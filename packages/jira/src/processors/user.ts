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
      `${mappingPrefixes.user}_${this.apiData.accountId}`
    );
    const orgData = await this.getOrganizationId(this.apiData.organization);
    const userObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.user}_${this.apiData?.accountId}`,
        userId: this.apiData?.accountId,
        emailAddress: this.apiData?.emailAddress ?? null,
        userName: this.apiData?.username ?? null,
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
        isDeleted: !!this.apiData.isDeleted,
        deletedAt: this.apiData?.deletedAt ?? null,
        createdAt: this.apiData.createdAt,
        organizationId: orgData.body.id ?? null,
      },
    };
    return userObj;
  }
}
