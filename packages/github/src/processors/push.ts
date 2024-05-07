import { Github } from 'abstraction';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class PushProcessor extends DataProcessor<
  Github.ExternalType.Webhook.Push,
  Github.Type.Push
> {
  constructor(data: Github.ExternalType.Webhook.Push) {
    super(data);
  }
  public async processor(): Promise<Github.Type.Push> {
    const githubId = `${mappingPrefixes.push}_${this.ghApiData.id}`;
    let parentId = await this.getParentId(githubId);
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(parentId, githubId);
    }
    const commitsArr: Array<string> = this.ghApiData.commits.map(
      (data: { id: string }) => `${mappingPrefixes.commit}_${data.id}`
    );
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const createdAt = new Date().toISOString();
    const orgObj = {
      id: parentId,
      body: {
        id: `${mappingPrefixes.push}_${this.ghApiData.id}`,
        githubPushId: `${this.ghApiData.id}`,
        pusherId: `${mappingPrefixes.user}_${this.ghApiData.pusherId}`,
        ref: this.ghApiData.ref,
        commits: commitsArr,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.orgId}`,
        action,
        createdAt,
        createdAtDay: moment(createdAt).format('dddd'),
        computationalDate: await this.calculateComputationalDate(createdAt),
        githubDate: moment(createdAt).format('YYYY-MM-DD'),
      },
    };
    return orgObj;
  }
}
