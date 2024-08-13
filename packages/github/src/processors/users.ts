import { Github } from 'abstraction';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class UsersProcessor extends DataProcessor<Github.ExternalType.Api.User, Github.Type.User> {
  constructor(data: Github.ExternalType.Api.User, requestId: string, resourceId: string) {
    super(data, requestId, resourceId);
  }
  public async processor(): Promise<Github.Type.User> {
    const githubId = `${mappingPrefixes.user}_${this.ghApiData.id}`;
    let parentId = await this.getParentId(githubId);
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, githubId);
    }
    const createdAt = this.ghApiData.created_at ?? new Date().toISOString();
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const userObj = {
      id: parentId,
      body: {
        id: `${mappingPrefixes.user}_${this.ghApiData?.id}`,
        githubUserId: this.ghApiData?.id,
        userName: this.ghApiData?.login,
        avatarUrl: this.ghApiData?.avatar_url,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.orgId}`,
        deletedAt: this.ghApiData.deleted_at,
        createdAt,
        action,
        createdAtDay: moment(createdAt).format('dddd'),
        computationalDate: await this.calculateComputationalDate(createdAt),
        githubDate: moment(createdAt).format('YYYY-MM-DD'),
        isDeleted: !!this.ghApiData.deleted_at,
      },
    };
    return userObj;
  }
}
