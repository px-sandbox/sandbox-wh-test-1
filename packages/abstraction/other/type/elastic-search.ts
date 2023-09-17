export type HitSource = {
  [key: string]: unknown;
};

export type Result = {
  hits: { hits: { _source: Record<string, unknown> }[] };
};
