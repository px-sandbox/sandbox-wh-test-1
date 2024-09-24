export enum Repo {
  Archived = 'archived',
  Created = 'created',
  Deleted = 'deleted',
  Edited = 'edited',
  Privatized = 'privatized',
  Publicized = 'publicized',
  Renamed = 'renamed',
  Transferred = 'transferred',
  Unarchived = 'unarchived',
}

export enum Branch {
  Created = 'create',
  Deleted = 'delete',
}

export enum Organization {
  Deleted = 'deleted',
  MemberAdded = 'member_added',
  MemberInvited = 'member_invited',
  MemberRemoved = 'member_removed',
  Renamed = 'renamed',
}

export enum Comments {
  REVIEW_COMMENTED = 'review_commented',
  PR_COMMENTED = 'pr_commented',
}

export enum PullRequest {
  Assigned = 'assigned',
  AutoMergeDisabled = 'auto_merge_disabled',
  AutoMergeEnabled = 'auto_merge_enabled',
  Closed = 'closed',
  ConvertedToDraft = 'converted_to_draft',
  Demilestoned = 'demilestoned',
  Dequeued = 'dequeued',
  Edited = 'edited',
  Enqueued = 'enqueued',
  Labeled = 'labeled',
  Locked = 'locked',
  Milestoned = 'milestoned',
  Opened = 'opened',
  ReadyForReview = 'ready_for_review',
  Reopened = 'reopened',
  ReviewRequestRemoved = 'review_request_removed',
  ReviewRequested = 'review_requested',
  Synchronize = 'synchronize',
  Unassigned = 'unassigned',
  Unlabeled = 'unlabeled',
  Unlocked = 'unlocked',
  ReviewSubmitted = 'review_submitted',
}

export enum OrgInstallation {
  Created = 'created',
  Deleted = 'deleted',
}

export enum PRReviewComment {
  Created = 'created',
  Deleted = 'deleted',
}
