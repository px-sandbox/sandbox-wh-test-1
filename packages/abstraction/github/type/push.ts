import { actions } from './actions';
import { retryProcess } from './retry-process';

export type Push = retryProcess & {
  id: string;
  body: {
    id: string;
    githubPushId: string;
    ref: string;
    pusherId: string;
    commits: string[];
    organizationId: string;
    action: actions;
    createdAtDay: string;
    computationalDate: string;
    githubDate: string | Date;
  };
};

export type CommitIds = {
  id: string;
};
