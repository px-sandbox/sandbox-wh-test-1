import { StackContext, Config } from 'sst/constructs';

export const commonConfig = ({ stack }: StackContext): {
  OPENSEARCH_NODE: Config.Secret;
  OPENSEARCH_USERNAME: Config.Secret;
  OPENSEARCH_PASSWORD: Config.Secret;
  JIRA_CLIENT_ID: Config.Secret;
  JIRA_CLIENT_SECRET: Config.Secret;
  JIRA_REDIRECT_URI: Config.Secret;
  AUTH_PUBLIC_KEY: Config.Secret;
} => ({
  OPENSEARCH_NODE: new Config.Secret(stack, 'OPENSEARCH_NODE'),
  OPENSEARCH_USERNAME: new Config.Secret(stack, 'OPENSEARCH_USERNAME'),
  OPENSEARCH_PASSWORD: new Config.Secret(stack, 'OPENSEARCH_PASSWORD'),
  JIRA_CLIENT_ID: new Config.Secret(stack, 'JIRA_CLIENT_ID'),
  JIRA_CLIENT_SECRET: new Config.Secret(stack, 'JIRA_CLIENT_SECRET'),
  JIRA_REDIRECT_URI: new Config.Secret(stack, 'JIRA_REDIRECT_URI'),
  AUTH_PUBLIC_KEY: new Config.Secret(stack, 'AUTH_PUBLIC_KEY'),
});
