import { Github } from 'abstraction';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class PRReviewCommentProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PRReviewComment,
  Github.Type.PRReviewComment
> {
  private pullId;
  private repoId;
  private action;
  constructor(
    data: Github.ExternalType.Webhook.PRReviewComment,
    pullId: number,
    repoId: number,
    action: string,
    private orgId: number,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.PRReviewComment);
    this.pullId = pullId;
    this.repoId = repoId;
    this.action = action;
    this.validate();
  }

  public async process(): Promise<void> {
    switch (this.action.toLowerCase()) {
      case Github.Enums.PRReviewComment.Created:
      case Github.Enums.PRReviewComment.Edited:
        await this.format(false);
        break;
      case Github.Enums.PRReviewComment.Deleted:
        await this.format(true);
        break;
      default:
        throw new Error(`Invalid action type ${this.action}`);
    }
  }

  public async format(isDeleted: boolean): Promise<void> {
    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.pRReviewComment}_${this.ghApiData.id}`),
      body: {
        id: `${mappingPrefixes.pRReviewComment}_${this.ghApiData.id}`,
        githubPRReviewCommentId: this.ghApiData.id,
        pRReviewId: this.ghApiData.pull_request_review_id,
        diffHunk: this.ghApiData.diff_hunk,
        path: this.ghApiData.path,
        commitId: `${mappingPrefixes.commit}_${this.ghApiData.commit_id}`,
        commentedBy: `${mappingPrefixes.user}_${this.ghApiData.user.id}`,
        commentBody: this.ghApiData.body,
        createdAt: this.ghApiData.created_at,
        updatedAt: this.ghApiData.updated_at,
        reactions: {
          totalCount: this.ghApiData.reactions.total_count,
          '+1': this.ghApiData.reactions['+1'],
          '-1': this.ghApiData.reactions['-1'],
          laugh: this.ghApiData.reactions.laugh,
          hooray: this.ghApiData.reactions.hooray,
          confused: this.ghApiData.reactions.confused,
          heart: this.ghApiData.reactions.heart,
          rocket: this.ghApiData.reactions.rocket,
          eyes: this.ghApiData.reactions.eyes,
        },
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
        createdAtDay: moment(this.ghApiData.created_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.created_at),
        githubDate: moment(this.ghApiData.created_at).format('YYYY-MM-DD'),
        isDeleted,
      },
    };
  }
}
