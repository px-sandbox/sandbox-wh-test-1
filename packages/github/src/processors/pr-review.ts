import { Github } from 'abstraction';
import moment from 'moment';
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
    action: string,
    private orgId: number,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.PRReview);
    this.pullId = pullId;
    this.repoId = repoId;
    this.action = action;
    this.validate();
  }

  public async process(): Promise<void> {
    await this.format();
  }

  public async format(): Promise<void> {
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.pRReview}_${this.ghApiData.id}`),
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
        organizationId: `${mappingPrefixes.organization}_${this.orgId}`,
        action: [
          {
            action: this.action ?? 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment(this.ghApiData.submitted_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.submitted_at),
        githubDate: moment(this.ghApiData.submitted_at).format('YYYY-MM-DD'),
      },
    };
  }
}
