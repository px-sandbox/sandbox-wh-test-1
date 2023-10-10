import { StackContext, Config } from 'sst/constructs';

export const commonConfig = ({ stack }: StackContext) => ({
  OPENSEARCH_NODE: new Config.Secret(stack, 'OPENSEARCH_NODE'),
  OPENSEARCH_USERNAME: new Config.Secret(stack, 'OPENSEARCH_USERNAME'),
  OPENSEARCH_PASSWORD: new Config.Secret(stack, 'OPENSEARCH_PASSWORD'),
  JIRA_CLIENT_ID: new Config.Secret(stack, 'JIRA_CLIENT_ID'),
  JIRA_CLIENT_SECRET: new Config.Secret(stack, 'JIRA_CLIENT_SECRET'),
  JIRA_REDIRECT_URI: new Config.Secret(stack, 'JIRA_REDIRECT_URI'),
});
