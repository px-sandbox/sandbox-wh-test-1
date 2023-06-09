import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

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
      commitsArr.push(data.id);
    });
    const orgObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.push}_${this.ghApiData.id}`,
        githubPushId: `${this.ghApiData.id}`,
        pusherId: this.ghApiData.pusherId,
        ref: this.ghApiData.ref,
        commits: commitsArr,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
      },
    };
    return orgObj;
  }
}
