import { StackContext, Config } from 'sst/constructs';

export const commonConfig = ({ stack }: StackContext): {
  OPENSEARCH_NODE: Config.Secret;
  OPENSEARCH_USERNAME: Config.Secret;
  OPENSEARCH_PASSWORD: Config.Secret;
  JIRA_CLIENT_ID: Config.Secret;
  JIRA_CLIENT_SECRET: Config.Secret;
  JIRA_REDIRECT_URI: Config.Secret;
  AUTH_PUBLIC_KEY: Config.Secret;
  GIT_ORGANIZATION_ID: Config.Secret;
  GITHUB_APP_PRIVATE_KEY_PEM: Config.Secret;
  GITHUB_APP_ID: Config.Secret;
  GITHUB_BASE_URL: Config.Secret;
  GITHUB_SG_INSTALLATION_ID: Config.Secret;
  GITHUB_WEBHOOK_SECRET: Config.Secret;
  GITHUB_SG_ACCESS_TOKEN: Config.Secret;
  AVAILABLE_PROJECT_KEYS: Config.Secret;
  PROJECT_DELETION_AGE: Config.Secret;
  SAST_ERROR_BUCKET: Config.Secret;
} => ({
  OPENSEARCH_NODE: new Config.Secret(stack, 'OPENSEARCH_NODE'),
  OPENSEARCH_USERNAME: new Config.Secret(stack, 'OPENSEARCH_USERNAME'),
  OPENSEARCH_PASSWORD: new Config.Secret(stack, 'OPENSEARCH_PASSWORD'),
  JIRA_CLIENT_ID: new Config.Secret(stack, 'JIRA_CLIENT_ID'),
  JIRA_CLIENT_SECRET: new Config.Secret(stack, 'JIRA_CLIENT_SECRET'),
  JIRA_REDIRECT_URI: new Config.Secret(stack, 'JIRA_REDIRECT_URI'),
  AUTH_PUBLIC_KEY: new Config.Secret(stack, 'AUTH_PUBLIC_KEY'),
  AVAILABLE_PROJECT_KEYS: new Config.Secret(stack, 'AVAILABLE_PROJECT_KEYS'),
  PROJECT_DELETION_AGE: new Config.Secret(stack, 'PROJECT_DELETION_AGE'),

  /** GITHUB SECRETS */
  GITHUB_APP_PRIVATE_KEY_PEM: new Config.Secret(stack, 'GITHUB_APP_PRIVATE_KEY_PEM'),
  GITHUB_APP_ID: new Config.Secret(stack, 'GITHUB_APP_ID'),
  GITHUB_BASE_URL: new Config.Secret(stack, 'GITHUB_BASE_URL'),
  GITHUB_SG_INSTALLATION_ID: new Config.Secret(stack, 'GITHUB_SG_INSTALLATION_ID'),
  GITHUB_WEBHOOK_SECRET: new Config.Secret(stack, 'GITHUB_WEBHOOK_SECRET'),
  GITHUB_SG_ACCESS_TOKEN: new Config.Secret(stack, 'GITHUB_SG_ACCESS_TOKEN'),
  GIT_ORGANIZATION_ID: new Config.Secret(stack, 'GIT_ORGANIZATION_ID'),
  SAST_ERROR_BUCKET: new Config.Secret(stack, 'SAST_ERROR_BUCKET'),
});
