import { StackContext, use, Config } from 'sst/constructs';
import { gh } from './github';

export function devops({ stack }: StackContext) {
  const { ghAPI } = use(gh);

  new Config.Parameter(stack, 'GITHUB_HTTP_API_ID', {
    value: ghAPI.httpApiId,
  });
}
