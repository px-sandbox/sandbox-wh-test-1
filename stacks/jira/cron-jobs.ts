import { Cron, Function } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';

export function intializeJiraCron(
  stack: Stack,
  // eslint-disable-next-line @typescript-eslint/ban-types
  refreshToken: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  hardDeleteProjectsData: Function
): {
  refreshTokenCron: Cron;
  deleteProjectCron: Cron;
} {

  // initialize a cron for jira refresh token that runs every second month at 00:00 UTC

  const refreshTokenCron = new Cron(stack, 'cronRefreshToken', {
    schedule: 'cron(0/45 * ? * * *)',
    job: refreshToken,
  });

  // cron to hard delete projects after 90 days

  const deleteProjectCron = new Cron(stack, 'hard-delete-project-cron', {
    schedule: 'cron(00 00 * * ? *)',
    job: hardDeleteProjectsData,
  });

  return {
    refreshTokenCron,
    deleteProjectCron,
  };
}
