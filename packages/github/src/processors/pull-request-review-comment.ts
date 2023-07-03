import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class PullRequestReviewCommentProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequestReviewComment,
  Github.Type.PullRequestReviewComment
> {
  private pullId;
  private repoId;
  private action;
  constructor(
    data: Github.ExternalType.Webhook.PullRequestReviewComment,
    pullId: number,
    repoId: number,
    action: string
  ) {
    super(data);
    this.pullId = pullId;
    this.repoId = repoId;
    this.action = action;
  }
  async processor(): Promise<Github.Type.PullRequestReviewComment> {
    const parentId: string = await this.getParentId(
      `${mappingPrefixes.pullRequestReviewComment}_${this.ghApiData.id}`
    );

    const action = [
      {
        action: this.action ?? 'initialized',
        actionTime: new Date().toISOString(),
      },
    ];
    const pullRequestReviewCommentObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.pullRequestReviewComment}_${this.ghApiData.id}`,
        githubPullRequestReviewCommentId: this.ghApiData.id,
        pullRequestReviewId: this.ghApiData.pull_request_review_id,
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
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        action: action,
      },
    };
    return pullRequestReviewCommentObj;
  }
}
