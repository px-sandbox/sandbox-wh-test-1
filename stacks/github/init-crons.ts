import { Stack } from "aws-cdk-lib";
import { Cron, Function } from "sst/constructs";
import { Stage } from "../type/stack-config";

export function initializeCron(
    stack: Stack,
    stage: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    cronFunctions: Record<string, Function>,
): void {
    const {
        processRetryFunction,
        ghCopilotFunction,
        ghBranchCounterFunction,
        ghUpdateLatestDepOnDDBFunction
    } = cronFunctions;
    /** 
     * Initialized cron job for every 1 hour to 
     * fetch failed processes from `retryProcessTable` Table and process them out
     * Cron Expression : cron(Minutes Hours Day-of-month Month Day-of-week Year
     */
    // eslint-disable-next-line no-new
    new Cron(stack, 'cronFailedProcessRetry', {
        schedule: 'cron(0/5 * ? * * *)',
        job: processRetryFunction,
    });

    if (stage === Stage.LIVE) {
        // eslint-disable-next-line no-new
        new Cron(stack, 'cronGithubCopilot', {
            schedule: 'cron(0 * ? * * *)',
            job: ghCopilotFunction,
        });
    }
    /**
     *  initialize a cron that runs every night at 23:30 UTC
     */
    // eslint-disable-next-line no-new
    new Cron(stack, 'cronBranchCounter', {
        schedule: 'cron(30 23 ? * * *)',
        job: ghBranchCounterFunction,
    });

    /**
     * initialize a cron to update latest release and versions of libraries in DynamoDB
     * that runs every night at 12:00 UTC
     */
    // eslint-disable-next-line no-new
    new Cron(stack, 'cronUpdateLatestDepOnDDB', {
        schedule: 'cron(0 0 ? * * *)',
        job: ghUpdateLatestDepOnDDBFunction,
    });
}