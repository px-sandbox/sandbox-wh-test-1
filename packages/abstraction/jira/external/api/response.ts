export type Response<T> = {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: Array<T>;
};

export type IssuesResponse<T> = {
  maxResults: number;
  startAt: number;
  total: number;

  issues: Array<T>;
};

export type IssueStatusResponse<T> = {
  startAt: number;
  total: number;
  maxResults: number;
  values: Array<T>;
};
