import { Function, Queue, use } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';
import { commonConfig } from '../common/config';
import { JiraTables } from '../type/tables';

// eslint-disable-next-line @typescript-eslint/ban-types
export function initializeFunctions(stack: Stack, queues: Queue[], tables: JiraTables): Function[] {
    const {
        JIRA_CLIENT_ID,
        JIRA_CLIENT_SECRET,
        JIRA_REDIRECT_URI,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        PROJECT_DELETION_AGE_DAYS,
    } = use(commonConfig);
    const { jiraMappingTable, jiraCredsTable, processJiraRetryTable } = tables;

    const refreshToken = new Function(stack, 'fnRefreshToken', {
        handler: 'packages/jira/src/cron/refresh-token.updateRefreshToken',
        bind: [jiraCredsTable, JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, JIRA_REDIRECT_URI],
    });
    const processJiraRetryFunction = new Function(stack, 'fnRetryProcess', {
        handler: 'packages/jira/src/cron/process-jira-retry.handler',
        bind: [
            jiraMappingTable,
            jiraCredsTable,
            processJiraRetryTable,
            JIRA_CLIENT_ID,
            JIRA_CLIENT_SECRET,
            JIRA_REDIRECT_URI,
            ...queues,
        ],
    });

    const hardDeleteProjectsData = new Function(stack, 'hard-delete-projects-data', {
        handler: 'packages/jira/src/cron/hard-delete-projects.handler',
        bind: [
            jiraMappingTable,
            JIRA_CLIENT_ID,
            JIRA_CLIENT_SECRET,
            OPENSEARCH_NODE,
            OPENSEARCH_PASSWORD,
            OPENSEARCH_USERNAME,
            PROJECT_DELETION_AGE_DAYS,
            ...queues,
        ]
    });
    return [refreshToken, processJiraRetryFunction, hardDeleteProjectsData];
}