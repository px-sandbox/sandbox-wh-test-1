import moment from 'moment';
import { Github } from 'abstraction';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class PRReviewProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PRReview,
  Github.Type.PRReview
> {
  private pullId;
  private repoId;
  private action;
  constructor(
    data: Github.ExternalType.Webhook.PRReview,
    pullId: number,
    repoId: number,
    action: string
  ) {
    super(data);
    this.pullId = pullId;
    this.repoId = repoId;
    this.action = action;
  }
  public async processor(): Promise<Github.Type.PRReview> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.pRReview}_${this.ghApiData.id}`
    );
    const action = [
      {
        action: this.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];

    const pRReviewObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.pRReview}_${this.ghApiData.id}`,
        githubPRReviewId: this.ghApiData.id,
        commitId: `${mappingPrefixes.commit}_${this.ghApiData.commit_id}`,
        reviewedBy: `${mappingPrefixes.user}_${this.ghApiData.user.id}`,
        reviewBody: this.ghApiData.body,
        submittedAt: this.ghApiData.submitted_at,
        state: this.ghApiData.state,
        pullId: `${mappingPrefixes.pull}_${this.pullId}`,
        repoId: `${mappingPrefixes.repo}_${this.repoId}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        action,
        createdAtDay: moment(this.ghApiData.submitted_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.submitted_at),
        githubDate: moment(this.ghApiData.submitted_at).format('YYYY-MM-DD'),
      },
    };
    return pRReviewObj;
  }
}
