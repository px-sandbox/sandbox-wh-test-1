import { StackContext, Config } from 'sst/constructs';

export function commonConfig({ stack }: StackContext): Record<string, Config.Secret> {
  const stacksSecret = {} as Record<string, Config.Secret>;
  stacksSecret.OPENSEARCH_NODE = new Config.Secret(stack, 'OPENSEARCH_NODE');
  stacksSecret.OPENSEARCH_USERNAME = new Config.Secret(stack, 'OPENSEARCH_USERNAME');
  stacksSecret.OPENSEARCH_PASSWORD = new Config.Secret(stack, 'OPENSEARCH_PASSWORD');
  stacksSecret.JIRA_CLIENT_ID = new Config.Secret(stack, 'JIRA_CLIENT_ID');
  stacksSecret.JIRA_CLIENT_SECRET = new Config.Secret(stack, 'JIRA_CLIENT_SECRET');
  stacksSecret.JIRA_REDIRECT_URI = new Config.Secret(stack, 'JIRA_REDIRECT_URI');
  stacksSecret.AUTH_PUBLIC_KEY = new Config.Secret(stack, 'JIRA_AUTH_PUBLIC_KEY');
  return stacksSecret;
}
