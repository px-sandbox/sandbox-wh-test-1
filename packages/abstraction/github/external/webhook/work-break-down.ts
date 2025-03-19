export interface WorkBreakdown {
  newFeature: number;
  refactor: number;
  rewrite: number;
}

export interface CommitWorkBreakdown {
  commitId: string;
  repoId: string;
  orgId: string;
  workbreakdown: WorkBreakdown;
}

export interface WorkbreakdownMessage {
    // combine commitWorkBreakdown and reqCtx
    message: CommitWorkBreakdown & {
        processId: string;
    },
    reqCtx: {
        requestId: string;
        resourceId: string;
    }
}