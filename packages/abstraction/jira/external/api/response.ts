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
  // isLast: boolean;
  issues: Array<T>;
};


// export type UsersResponse<T> = {
//   maxResults: number;
//   startAt: number;
//   users: Array<T>;
// };
