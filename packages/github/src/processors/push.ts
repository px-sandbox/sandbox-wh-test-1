import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';
import moment from 'moment';

export class PushProcessor extends DataProcessor<
  Github.ExternalType.Webhook.Push,
  Github.Type.Push
> {
  constructor(data: Github.ExternalType.Webhook.Push) {
    super(data);
  }
  async processor(): Promise<Github.Type.Push> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.commit}_${this.ghApiData.id}`
    );
    const commitsArr: Array<string> = [];
    this.ghApiData.commits.map((data: { id: string }) => {
      commitsArr.push(`${mappingPrefixes.commit}_${data.id}`);
    });
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.push}_${this.ghApiData.id}`,
        githubPushId: `${this.ghApiData.id}`,
        pusherId: `${mappingPrefixes.user}_${this.ghApiData.pusherId}`,
        ref: this.ghApiData.ref,
        commits: commitsArr,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        action: action,
      },
    };
    return orgObj;
  }
}
