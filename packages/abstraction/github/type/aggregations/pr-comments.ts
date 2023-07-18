export interface IPrCommentAggregationResponse {
  commentsPerDay: {
    buckets: [
      {
        key_as_string: string;
        combined_avg: {
          value: number;
        };
      }
    ];
  };
}
