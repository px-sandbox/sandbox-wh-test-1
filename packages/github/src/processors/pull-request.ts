import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { DataProcessor } from './data-processor';

export class PullRequestProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  constructor(data: Github.ExternalType.Webhook.PullRequest) {
    super(data);
  }
  async processor(): Promise<Github.Type.PullRequest> {
    const parentId: string = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    // const staticBody = {
    //   id: 'gh-pull_9789890',
    //   githubPullId: 89798908,
    //   number: 6,
    //   state: 'open',
    //   title: 'dda edfa',
    //   pullRequestCreatedBy: 'meeta',
    //   body: 'ddd',
    //   createdAt: '2023-06-09T07:30:10Z',
    //   updatedAt: '2023-06-09T07:30:10Z',
    //   closedAt: '2023-06-09T07:30:10Z',
    //   mergedAt: '2023-06-09T07:30:10Z',
    //   requestedReviewers: [{ login: 'meeta' }],
    //   labels: [{ name: 'meeta' }],
    //   head: {
    //     label: 'dd',
    //     ref: 'ewtew',
    //   },
    //   base: {
    //     label: 'ewre',
    //     ref: 'dsfs',
    //   },
    //   mergedBy: 'meeta',
    //   comments: 2,
    //   reviewComments: 8,
    //   commits: 4,
    //   additions: 2,
    //   deletions: 0,
    //   changedFiles: 1,
    //   repoId: `${mappingPrefixes.repo}_${this.ghApiData.head.repo.id}`,
    //   organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
    // };
    const pullObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.pull}_${this.ghApiData.id}`,
        githubPullId: this.ghApiData.id,
        number: this.ghApiData.number,
        state: this.ghApiData.state,
        title: this.ghApiData.title,
        pullRequestCreatedBy: this.ghApiData.user.login,
        body: this.ghApiData.body,
        createdAt: this.ghApiData.created_at,
        updatedAt: this.ghApiData.updated_at,
        closedAt: this.ghApiData.closed_at,
        mergedAt: this.ghApiData.merged_at,
        requestedReviewers: [{ login: 'meeta' }],

        repoId: `${mappingPrefixes.repo}_${this.ghApiData.head.repo.id}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
      },
    };
    return pullObj;
  }
}
// labels: [{ name: 'meeta' }],
//         head: {
//           label: this.ghApiData.head.label,
//           ref: this.ghApiData.head.ref,
//         },
//         base: {
//           label: this.ghApiData.base.label,
//           ref: this.ghApiData.base.ref,
//         },
//         mergedBy: this.ghApiData.merged_by,
//         comments: this.ghApiData.comments,
//         reviewComments: this.ghApiData.review_comments,
//         commits: this.ghApiData.commits,
//         additions: this.ghApiData.additions,
//         deletions: this.ghApiData.deletions,
//         changedFiles: this.ghApiData.changed_files,
