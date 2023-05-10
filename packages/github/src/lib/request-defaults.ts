import { Octokit } from 'octokit';

export const ghRequest = new Octokit({
  headers: {
    'X-GitHub-Api-Version': '2022-11-28',
  },
});
