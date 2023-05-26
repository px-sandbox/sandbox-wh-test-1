import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { GIT_ORGANIZATION_ID, mappingPrefixes } from 'src/constant/config';
import { Queue } from 'sst/node/queue';
import { DataFormatter } from './data-formatter';

export class Users extends DataFormatter<Github.ExternalType.Api.User, Github.Type.User> {
  constructor(data: Github.ExternalType.Api.User) {
    super(data);
  }
  async formatter(): Promise<Github.Type.User> {
    const parentId: string = await this.getParentId(`${mappingPrefixes.user}_${this.ghApiData.id}`);
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.user}_${this.ghApiData?.id}`,
        githubUserId: this.ghApiData?.id,
        userName: this.ghApiData?.login,
        avatarUrl: this.ghApiData?.avatar_url,
        organizationId: `${mappingPrefixes.organization}_${GIT_ORGANIZATION_ID}`,
        deletedAt: '',
      },
    };
    await this.sendDataToQueue(orgObj, Queue.gh_users_index.queueUrl);
    return orgObj;
  }
}
