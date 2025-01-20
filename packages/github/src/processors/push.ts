import { Github } from 'abstraction';
import moment from 'moment';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class PushProcessor extends DataProcessor<
  Github.ExternalType.Webhook.Push,
  Github.Type.Push
> {
  constructor(data: Github.ExternalType.Webhook.Push, requestId: string, resourceId: string) {
    super(data, requestId, resourceId, Github.Enums.Event.Commit_Push);
    this.validate();
  }

  public async process(): Promise<void> {
    await this.format();
  }
  public async format(): Promise<void> {
    const commitsArr: Array<string> = this.ghApiData.commits.map(
      (data: { id: string }) => `${mappingPrefixes.commit}_${data.id}`
    );
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.push}_${this.ghApiData.id}`),
      body: {
        id: `${mappingPrefixes.push}_${this.ghApiData.id}`,
        githubPushId: `${this.ghApiData.id}`,
        pusherId: `${mappingPrefixes.user}_${this.ghApiData.pusherId}`,
        ref: this.ghApiData.ref,
        commits: commitsArr,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.orgId}`,
        action: [
          {
            action: this.ghApiData.action ?? 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAt: new Date().toISOString(),
        createdAtDay: moment().format('dddd'),
        computationalDate: await this.calculateComputationalDate(new Date().toISOString()),
        githubDate: moment().format('YYYY-MM-DD'),
      },
    };
  }
}
