export interface IFtpRateResponse {
  sprint_buckets: {
    buckets: [
      {
        key: string;
        doc_count: number;
        isFTP_true_count: {
          doc_count: number;
        };
      }
    ];
  };
}
