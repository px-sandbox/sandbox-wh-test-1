type LibVersion = {
  version: string;
  releaseDate: string;
  isDeprecated: boolean;
};
export type LibInfo = {
  name: string;
  latest: LibVersion;
  current: LibVersion;
};
