import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../../common/config';
import { JiraTables } from '../../type/tables';

export function initializeIssueStatusQueue(stack: Stack, jiraDDB: JiraTables): Queue[] {
    const {
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        JIRA_CLIENT_ID,
        JIRA_CLIENT_SECRET,
        JIRA_REDIRECT_URI,
        NODE_VERSION
    } = use(commonConfig);

    const issueStatusIndexDataQueue = new Queue(stack, 'qIssueStatusIndex', {
        consumer: {
            function: {
                handler: 'packages/jira/src/sqs/handlers/indexer/issue-status.handler',
                runtime: NODE_VERSION,
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    const issueStatusFormatDataQueue = new Queue(stack, 'qIssueStatusFormat');
    issueStatusFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnIssueStatusFormat', {
            handler: 'packages/jira/src/sqs/handlers/formatter/issue-status.handler',
            bind: [issueStatusFormatDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });


    issueStatusFormatDataQueue.bind([
        jiraDDB.jiraCredsTable,
        jiraDDB.jiraMappingTable,
        jiraDDB.processJiraRetryTable,
        issueStatusIndexDataQueue,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        JIRA_CLIENT_ID,
        JIRA_CLIENT_SECRET,
        JIRA_REDIRECT_URI,
    ]);
    issueStatusIndexDataQueue.bind([
        jiraDDB.jiraCredsTable,
        jiraDDB.jiraMappingTable,
        jiraDDB.processJiraRetryTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);

    return [issueStatusFormatDataQueue, issueStatusIndexDataQueue];
}
