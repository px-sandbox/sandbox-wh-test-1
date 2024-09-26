type LibVersion = {
  version: string;
  releaseDate: string;
  deprecated: boolean;
};
export type LibInfo = {
  name: string;
  latest: LibVersion;
  current: LibVersion;
};
