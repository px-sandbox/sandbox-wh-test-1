import { Octokit } from 'octokit';
import { throttling } from '@octokit/plugin-throttling';

const MyOctokit = Octokit.plugin(throttling);

export const ghRequest = new MyOctokit({
  throttle: {
    onRateLimit: (retryAfter: any, options: any, octokit: any, retryCount: any) => {
      throw new Error(`Request quota exhausted for request ${options.method} ${options.url}`);
    },
    onSecondaryRateLimit: (retryAfter: any, options: any, octokit: any) => {
      // does not retry, only logs a warning
      throw new Error(`Request quota exhausted for request ${options.method} ${options.url}`);
    },
  },
  headers: {
    'X-GitHub-Api-Version': '2022-11-28',
  },
});
