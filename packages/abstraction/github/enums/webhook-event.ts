export enum Event {
  Repo = 'repository',
  Branch = 'branch',
  Organization = 'organization',
  Commit = 'push',
  Commit_Push = 'commit_push',
  PullRequest = 'pull_request',
  PRReviewComment = 'pull_request_review_comment',
  PRReview = 'pull_request_review',
  Copilot = 'copilot',
  ActiveBranches = 'active_branches',
  InstallationCreated = 'installation.created',
}
