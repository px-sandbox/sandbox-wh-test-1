import { RequestInterface } from '@octokit/types';
import { Config } from 'sst/node/config';

export async function getOctokitTimeoutReqFn(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization?: string;
        Authorization?: string;
      };
    }
  >
): Promise<any> {
  return async (endpoint: string, params?: Record<string, string | number>) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Octokit request timed out')),
        parseInt(Config.REQUEST_TIMEOUT, 10)
      );
    });
    const requestPromise = octokit(endpoint, params);
    return Promise.race([requestPromise, timeoutPromise]);
  };
}
