import { Github } from 'abstraction';
import { logger } from 'core';
import moment from 'moment';
import { getPullRequestById } from 'src/lib/get-pull-request';
import { getTimezoneOfUser } from 'src/lib/get-user-timezone';
import { getWorkingTime } from 'src/util/timezone-calculation';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class PRProcessor extends DataProcessor<
  Github.ExternalType.Webhook.PullRequest,
  Github.Type.PullRequest
> {
  constructor(
    data: Github.ExternalType.Webhook.PullRequest,
    requestId: string,
    resourceId: string,
    processId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.PullRequest, processId);
    this.validate();
  }

  private async getPrData(): Promise<Github.Type.PullRequestBody | false> {
    const pull = await this.getParentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`);
    logger.info({
      message: 'PRProcessor.setPullObj.info: PULL REQUEST ID : ',
      data: this.ghApiData.id,
    });
    if (pull) {
      const [pullData] = await getPullRequestById(this.ghApiData.id);
      return pullData;
    }
    return false;
  }

  private updateGhApiData(pullData: Github.Type.PullRequestBody): void {
    if (pullData.reviewedAt) {
      this.ghApiData.reviewed_at = pullData.reviewedAt;
      this.ghApiData.review_seconds = pullData.reviewSeconds;
    }
    if (pullData.approvedAt) {
      this.ghApiData.approved_at = pullData.approvedAt;
    }
  }

  private async setClosed(): Promise<void> {
    const pullData = (await this.getPrData()) as Github.Type.PullRequestBody;
    if (pullData.merged === true && pullData.reviewedAt === null) {
      if (this.ghApiData.user.id !== this.ghApiData.merged_by?.id) {
        pullData.reviewedAt = this.ghApiData.merged_at;
        const createdTimezone = await getTimezoneOfUser(pullData.pRCreatedBy);
        pullData.reviewSeconds = getWorkingTime(
          moment(this.ghApiData.created_at),
          moment(this.ghApiData.merged_at),
          createdTimezone
        );
      }
    }
    await this.format();
  }

  private async setReviewRequested(): Promise<void> {
    const prExists = await this.getPrData();
    if (prExists) {
      await this.format();
    }
    logger.info({
      message: 'PRProcessor.setReviewRequested.info: PR_NOT_FOUND',
      data: { pr_number: this.ghApiData.number, repo_id: this.ghApiData.head.repo.id },
    });
    return;
  }

  private async format(): Promise<void> {
    const reqReviewersData = this.ghApiData.requested_reviewers.map((reqReviewer) => ({
      userId: `${mappingPrefixes.user}_${reqReviewer.id}`,
    }));
    const labelsData = this.ghApiData.labels.map((label) => ({
      name: label.name,
    }));

    this.formattedData = {
      id: await this.parentId(`${mappingPrefixes.pull}_${this.ghApiData.id}`),
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
        organizationId: `${mappingPrefixes.organization}_${this.ghApiData.head.repo.owner.id}`,
        action: [
          {
            action: this.ghApiData.action ?? 'initialized',
            actionTime: new Date().toISOString(),
            actionDay: moment().format('dddd'),
          },
        ],
        createdAtDay: moment(this.ghApiData.created_at).format('dddd'),
        computationalDate: await this.calculateComputationalDate(this.ghApiData.created_at),
        githubDate: moment(this.ghApiData.created_at).format('YYYY-MM-DD'),
      },
    };
  }

  public async process(): Promise<void> {
    try {
      switch (this.ghApiData.action) {
        case Github.Enums.PullRequest.ReviewRequested:
          await this.setReviewRequested();
          break;
        case Github.Enums.PullRequest.Closed:
          await this.setClosed();
          break;
        case Github.Enums.PullRequest.ReviewRequestRemoved:
        case Github.Enums.PullRequest.Edited:
        case Github.Enums.PullRequest.Reopened:
        case Github.Enums.PullRequest.Assigned:
        case Github.Enums.PullRequest.Unassigned:
        case Github.Enums.PullRequest.Labeled:
        case Github.Enums.PullRequest.Unlabeled:
        case Github.Enums.PullRequest.ReadyForReview:
        case Github.Enums.PullRequest.Opened:
        case Github.Enums.PullRequest.ConvertedToDraft:
          const pullData = (await this.getPrData()) as Github.Type.PullRequestBody;
          await this.updateGhApiData(pullData);
          await this.format();
          break;
        default:
          logger.info({
            message: 'PRProcessor.processor.info: no_pr_action_received',
            data: { pr_number: this.ghApiData.number },
          });
          break;
      }
    } catch (error) {
      logger.error({ message: 'PRProcessor.processor.error', error: `${error}` });
      throw error;
    }
  }
}
