import { Github } from 'abstraction';
import { mappingPrefixes } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logger } from 'core';
import moment from 'moment';
import { DataProcessor } from './data-processor';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';

const delayAr = [0, 1, 1, 2, 3, 5, 8];
export class PRProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  private esClient: ElasticSearchClient;
  constructor(data: Github.ExternalType.Webhook.PullRequest) {
    super(data);

    this.esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
  }

  private async delay(time: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, time);
      logger.info('Delay time : ', { delayTime: time });
    });
  }
  async isCommitExist(attempt: number): Promise<boolean> {
    if (attempt < 7) {
      // Set delay time in fibonacci series for 6 attempts to check commit id in dynamoDb.
      await this.delay(delayAr[attempt] * 1000);
      const commit = await this.getParentId(
        `${mappingPrefixes.commit}_${this.ghApiData.merge_commit_sha}`
      );
      logger.info('MERGE COMMIT ID : ', { commit: this.ghApiData.merge_commit_sha });

      // If commit exist then it will return true otherwise it will attempt again to check commit id.
      if (commit) {
        return true;
      }
      logger.info('NEXT ATTEMPT : ', { attempt: attempt + 1 });
      return this.isCommitExist(attempt + 1);
    }
    return false;
  }

  async isPRExist(attempt: number): Promise<boolean> {
    if (attempt < 7) {
      // Set delay time in fibonacci series for 6 attempts to check PR ID in dynamoDb.
      await this.delay(delayAr[attempt] * 1000);

      const pull = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
      logger.info('PULL REQUEST ID : ', this.ghApiData.id);

      // If commit exist then it will return true otherwise it will attempt again to check commit id.
      if (pull) {
        return true;
      }
      logger.info('NEXT ATTEMPT : ', { attempt: attempt + 1 });
      return this.isPRExist(attempt + 1);
    }
    return false;
  }

  async processor(): Promise<Github.Type.PullRequest> {
    /**
     * On PR closed check if the PR is merged or not.
     * If merged then check merged commit id exists or not.
     * If not exists then hold for few seconds and check again.
     * If not found commit id till 6th attempt then throw error.
     * If commit id exists then update commit and proceed with PR.
     */
    if (
      this.ghApiData.action === Github.Enums.PullRequest.Closed &&
      this.ghApiData.merged === true
    ) {
      const commitParentId = await this.isCommitExist(1);

      if (commitParentId) {
        const matchQry = esb
          .matchQuery('body.id', `${mappingPrefixes.pull}_${this.ghApiData.id}`)
          .toJSON();
        const searchMergeCommit = this.esClient.searchWithEsb(
          Github.Enums.IndexName.GitCommits,
          matchQry
        );

        const mergeCommitDetail: Array<Github.Type.Commits> = await searchedDataFormator(
          searchMergeCommit
        );

        await new SQSClient().sendMessage(
          {
            commitId: this.ghApiData.merge_commit_sha,
            isMergedCommit: this.ghApiData.merged,
            mergedBranch: this.ghApiData.base.ref,
            pushedBranch: this.ghApiData.head.ref,
            repository: {
              id: this.ghApiData.head.repo.id,
              name: this.ghApiData.head.repo.name,
              owner: this.ghApiData.head.repo.owner.login,
            },
            timestamp: mergeCommitDetail.at(0)?.body.committedAt,
          },
          Queue.gh_commit_format.queueUrl
        );
      } else {
        logger.error('MERGE_COMMIT_NOT_FOUND', this.ghApiData);
        throw new Error('ATTEMPT EXCEED : MERGE_COMMIT_NOT_FOUND');
      }
    }

    /**
     * On PR's review requested action, we need to delay few seconds to check PR already exists.
     */
    if (this.ghApiData.action === Github.Enums.PullRequest.ReviewRequested) {
      const pullExist = await this.isPRExist(1);
      if (!pullExist) {
        logger.error('PULL_REQUEST_NOT_FOUND', this.ghApiData);
        throw new Error('ATTEMPT EXCEED : PULL_REQUEST_NOT_FOUND');
      }
    }

    const parentId: string = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    const reqReviewersData: Array<Github.Type.RequestedReviewers> = [];
    this.ghApiData.requested_reviewers.map((reqReviewer) => {
      reqReviewersData.push({
        userId: `${mappingPrefixes.user}_${reqReviewer.id}`,
      });
    });

    const labelsData: Array<Github.Type.Labels> = [];
    this.ghApiData.labels.map((label) => {
      labelsData.push({
        name: label.name,
      });
    });
    const action = [
      {
        action: this.ghApiData.action ?? 'initialized',
        actionTime: new Date().toISOString(),
        actionDay: moment().format('dddd'),
      },
    ];
    const pullObj = {
      id: parentId || uuid(),
      body: {
        id: `${mappingPrefixes.pull}_${this.ghApiData.id}`,
        githubPullId: this.ghApiData.id,
        pullNumber: this.ghApiData.number,
        state: this.ghApiData.state,
        title: this.ghApiData.title,
        pRCreatedBy: `${mappingPrefixes.user}_${this.ghApiData.user.id}`,
        pullBody: this.ghApiData.body,
        createdAt: this.ghApiData.created_at,
        updatedAt: this.ghApiData.updated_at,
        closedAt: this.ghApiData.closed_at,
        mergedAt: this.ghApiData.merged_at,
        reviewedAt: this.ghApiData.reviewed_at,
        approvedAt: this.ghApiData.approved_at,
        reviewSeconds: this.ghApiData.review_seconds ? this.ghApiData.review_seconds : 0,
        requestedReviewers: reqReviewersData,
        labels: labelsData,
        head: {
          label: this.ghApiData.head.label,
          ref: this.ghApiData.head.ref,
        },
        base: {
          label: this.ghApiData.base.label,
          ref: this.ghApiData.base.ref,
        },
        mergedBy: this.ghApiData.merged_by
          ? { userId: `${mappingPrefixes.user}_${this.ghApiData.merged_by.id}` }
          : null,
        merged: this.ghApiData.merged,
        mergedCommitId: this.ghApiData.merge_commit_sha
          ? `${mappingPrefixes.commit}_${this.ghApiData.merge_commit_sha}`
          : null,
        comments: this.ghApiData.comments,
        reviewComments: this.ghApiData.review_comments,
        commits: this.ghApiData.commits,
        additions: this.ghApiData.additions,
        deletions: this.ghApiData.deletions,
        changedFiles: this.ghApiData.changed_files,
        repoId: `${mappingPrefixes.repo}_${this.ghApiData.head.repo.id}`,
        organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
        action,
        createdAtDay: moment(this.ghApiData.created_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.created_at),
        githubDate: moment(this.ghApiData.created_at).format('YYYY-MM-DD'),
      },
    };
    return pullObj;
  }
}
