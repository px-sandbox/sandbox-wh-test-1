import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class Organization extends DataProcessor<
  Github.ExternalType.Webhook.Installation,
  Github.Type.Organization
>
 {
  constructor(
    private action: string,
    data: Github.ExternalType.Webhook.Installation,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.Organization);
  }

  public async process(): Promise<void> {
    switch (this.action.toLowerCase()) {
      case Github.Enums.OrgInstallation.Created:
        await this.format(false);
        break;
      case Github.Enums.OrgInstallation.Deleted:
        await this.format(true);
        break;
      default:
        throw new Error(`Invalid action type ${this.action}`);
    }
  }

  public async format(isDeleted: boolean): Promise<void> {
    this.formattedData = {
      id: await this.parentId(
        `${mappingPrefixes.organization}_${this.ghApiData.installation.account.id}`
      ),
      body: {
        id: `${mappingPrefixes.organization}_${this.ghApiData.installation.account.id}`,
        githubOrganizationId: this.ghApiData.installation.account.id,
        installationId: this.ghApiData.installationData?.id ?? null,
        appId: this.ghApiData.installation.app_id,
        name: this.ghApiData.installation.account.login,
        createdAt: this.ghApiData.installation.created_at,
        updatedAt: this.ghApiData.installation.updated_at,
        deletedAt: isDeleted ? this.ghApiData.installation.deleted_at : null,
        isDeleted,
      },
    };
  }
}
