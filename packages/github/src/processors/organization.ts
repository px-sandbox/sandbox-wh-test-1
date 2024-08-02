import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class Organization extends DataProcessor<
  Github.ExternalType.Webhook.Installation,
  Github.Type.Organization
> {
  constructor(
    data: Github.ExternalType.Webhook.Installation,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId);
  }
  public async processor(): Promise<Github.Type.Organization> {
    let parentId: string = await this.getParentId(
      `${mappingPrefixes.organization}_${this.ghApiData.installation.account.id}`
    );
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(
        parentId,
        `${mappingPrefixes.organization}_${this.ghApiData.installation.account.id}`
      );
    }
    const orgObj = {
      id: parentId,
      body: {
        id: `${mappingPrefixes.organization}_${this.ghApiData.installation.account.id}`,
        githubOrganizationId: this.ghApiData.installation.account.id,
        installationId: this.ghApiData.installation.id,
        appId: this.ghApiData.installation.app_id,
        name: this.ghApiData.installation.account.login,
        createdAt: this.ghApiData.installation.created_at,
        updatedAt: this.ghApiData.installation.updated_at,
      },
    };
    return orgObj;
  }
}
