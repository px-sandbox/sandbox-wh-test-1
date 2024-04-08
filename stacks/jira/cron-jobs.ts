import { Cron, Function } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';

export function intializeJiraCron(
  stack: Stack,

  // eslint-disable-next-line @typescript-eslint/ban-types
  processJiraRetryFunction: Function,

  // eslint-disable-next-line @typescript-eslint/ban-types
  refreshToken: Function,

  // eslint-disable-next-line @typescript-eslint/ban-types
  hardDeleteProjectsData: Function
): void {
  /**
   * Initialized cron job for every 1/2 hour to fetch failed processes from `jiraRetryProcessTable` Table
   * and process them out
   * Cron Expression : cron(Minutes Hours Day-of-month Month Day-of-week Year)*
   */

  // eslint-disable-next-line no-new
  new Cron(stack, 'cronRetryProcess', {
    schedule: 'cron(0/30 * ? * * *)',
    job: processJiraRetryFunction,
  });

  // initialize a cron for jira refresh token that runs every second month at 00:00 UTC
  // eslint-disable-next-line no-new
  new Cron(stack, 'cronRefreshToken', {
    schedule: 'cron(0/45 * ? * * *)',
    job: refreshToken,
  });

  // cron to hard delete projects after 90 days
  // eslint-disable-next-line no-new
  new Cron(stack, 'hard-delete-project-cron', {
    schedule: 'cron(00 00 * * ? *)',
    job: hardDeleteProjectsData,
  });
}
