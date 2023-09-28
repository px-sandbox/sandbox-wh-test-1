export type Response<T> = {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: Array<T>;
};
