import { Issue } from "../issue";
export interface IFtpRateResponse {
  hits: {
    hits: Issue[];
  },
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

export interface IReopenRateResponse {
  sprint_buckets: {
    buckets: [
      {
        key: string;
        doc_count: number;
        reopen_count: {
          doc_count: number;
        };
      }
    ];
  };
}

