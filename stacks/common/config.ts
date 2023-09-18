import { StackContext, Config } from 'sst/constructs';

export function commonConfig({ stack }: StackContext): Record<string, Config.Secret> {
  const stacksSecret = {} as Record<string, Config.Secret>;
  stacksSecret.OPENSEARCH_NODE = new Config.Secret(stack, 'OPENSEARCH_NODE');
  stacksSecret.OPENSEARCH_USERNAME = new Config.Secret(stack, 'OPENSEARCH_USERNAME');
  stacksSecret.OPENSEARCH_PASSWORD = new Config.Secret(stack, 'OPENSEARCH_PASSWORD');
  return stacksSecret;
}
