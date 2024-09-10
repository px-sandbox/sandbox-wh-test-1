import { Github } from 'abstraction';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class UsersProcessor extends DataProcessor<Github.ExternalType.Api.User, Github.Type.User> {
  constructor(
    private action: string,
    data: Github.ExternalType.Api.User,
    requestId: string,
    resourceId: string,
    processId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.Organization, processId);
  }

  public async process(): Promise<void> {
    switch (this.action.toLowerCase()) {
      case Github.Enums.Organization.MemberAdded:
        await this.format(false);
        break;
      case Github.Enums.Organization.MemberRemoved:
        await this.format(true);
        break;
      default:
        throw new Error(`Invalid action type ${this.action}`);
    }
  }

  public async format(isDeleted: boolean): Promise<void> {
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.user}_${this.ghApiData.id}`),
      body: {
        id: `${mappingPrefixes.user}_${this.ghApiData?.id}`,
        githubUserId: this.ghApiData?.id,
        userName: this.ghApiData?.login,
        avatarUrl: this.ghApiData?.avatar_url,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.orgId}`,
        deletedAt: this.ghApiData.deleted_at ?? new Date().toISOString(),
        createdAt: this.ghApiData.created_at ?? new Date().toISOString(),
        action: [
          {
            action: this.ghApiData.action ?? 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment(this.ghApiData.created_at ?? new Date().toISOString()).format('dddd'),
        computationalDate: await this.calculateComputationalDate(
          this.ghApiData.created_at ?? new Date().toISOString()
        ),
        githubDate: moment(this.ghApiData.created_at ?? new Date().toISOString()).format(
          'YYYY-MM-DD'
        ),
        isDeleted,
      },
    };
  }
}
