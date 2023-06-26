import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class UsersProcessor extends DataProcessor<Github.ExternalType.Api.User, Github.Type.User> {
  constructor(data: Github.ExternalType.Api.User) {
    super(data);
  }
  async processor(): Promise<Github.Type.User> {
    const parentId = await this.getParentId(`${mappingPrefixes.user}_${this.ghApiData.id}`);
    const createdAt = this.ghApiData.created_at ?? new Date();
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
      },
    ];
    const userObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.user}_${this.ghApiData?.id}`,
        githubUserId: this.ghApiData?.id,
        userName: this.ghApiData?.login,
        avatarUrl: this.ghApiData?.avatar_url,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        deletedAt: this.ghApiData.deleted_at,
        createdAt: createdAt,
        action: action,
      },
    };
    return userObj;
  }
}
