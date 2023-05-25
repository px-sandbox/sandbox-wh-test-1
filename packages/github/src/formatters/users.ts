import { Github } from 'abstraction';
import { DataFormatter } from './data-formatter';
import { v4 as uuid } from 'uuid';
import { GIT_ORGANIZATION_ID, mappingPrefixes } from 'src/constant/config';

export class Users extends DataFormatter<Github.ExternalType.Api.User, Github.Type.User> {
  constructor(data: Github.ExternalType.Api.User) {
    super(data);
  }
  formatter(parentId: string): Github.Type.User {
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
    return orgObj;
  }
}
