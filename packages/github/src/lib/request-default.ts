import { Octokit } from 'octokit';
import { throttling } from '@octokit/plugin-throttling';

const MyOctokit = Octokit.plugin(throttling);

export const ghRequest = new MyOctokit({
  throttle: {
    onRateLimit: (retryAfter: number, options: any, octokit: unknown, retryCount: number) => {
      throw new Error(
        `Request quota exhausted for request ${options?.method} ${options?.url} \nRetry Count: ${retryCount} \nRetry After: ${retryAfter} \nOcotkit: ${octokit}`
      );
    },
    onSecondaryRateLimit: (retryAfter: number, options: any, octokit: unknown) => {
      // does not retry, only logs a warning
      throw new Error(
        `Request quota exhausted for request ${options?.method} ${options?.url} \nRetry After: ${retryAfter} \nOcotkit: ${octokit}`
      );
    },
  },
  headers: {
    'X-GitHub-Api-Version': '2022-11-28',
  },
});
