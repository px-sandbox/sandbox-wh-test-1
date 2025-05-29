export type HitSource = {
  [key: string]: unknown;
};

export type Result = {
  hits: { hits: { _source: Record<string, unknown> }[] };
};

export type HitBody = {
  isDeleted?: boolean;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type Hit = {
  _id: string;
  _source: {
    body: HitBody;
    [key: string]: unknown;
  };
};

export interface ElasticSearchResponse {
  hits: {
    total: {
      value: number;
    };
    hits: Hit[];
  };
}

export interface FormattedData {
  _id: string;
  [key: string]: unknown;
}
