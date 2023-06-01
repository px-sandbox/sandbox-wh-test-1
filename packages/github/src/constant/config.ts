import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const { region } = process.env;
export const mappingPrefixes = {
  user: 'gh_user',
  branch: 'gh_branch',
  organization: 'gh_org',
  repo: 'gh_repo',
};
