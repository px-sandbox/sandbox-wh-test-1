import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Jira, Other } from "abstraction";
import { logger } from "core";
import { Config } from "sst/node/config";
import esb from "elastic-builder";
import { APIGatewayProxyEvent } from "aws-lambda";
import { SQSClient } from "@pulse/event-handler";
import { Queue } from "sst/node/queue";
import { searchedDataFormator } from "../util/response-formatter";
import { getOrganizationById } from "../repository/organization/get-organization";

export const handler = async function getIssuesList(event: APIGatewayProxyEvent): Promise<Other.Type.HitBody> {
    try {

        const jiraOrgId = `jira_org_${event?.queryStringParameters?.orgId}`;

        const esClient = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });


        const issueStatusquery = esb
            .boolQuery()
            .must([
                esb.termQuery('body.issueType', Jira.Enums.IssuesTypes.BUG),
                esb.termQuery('body.organizationId.keyword', jiraOrgId),
            ])
            .toJSON();

        logger.info('ESB_QUERY_ISSUE_STATUS_QUERY', { issueStatusquery });
        const data = await esClient.searchWithEsb(
            Jira.Enums.IndexName.Issue,
            issueStatusquery,
        );

        const issueData = await searchedDataFormator(data);
        const orgData = await getOrganizationById(jiraOrgId);

        issueData.forEach(async (bug) => {
            const formattedBug = {
                issue: {
                    id: bug.issueId,
                    key: bug.issueKey,
                    fields: {
                        project: {
                            id: bug.projectId,
                            key: bug.projectKey,
                        }
                    }
                },
                bugId: bug.issueId,
                organization: orgData,
                sprintId: bug?.sprintId.split('jira_sprint_')[1],
                boardId: bug.boardId,

            }
            await new SQSClient().sendMessage(formattedBug, Queue.qReOpenRateMigrator.queueUrl);

        });

        return issueData;

    } catch (error) {
        logger.error('get existing bug for reopen error', { error });
        throw error;
    }
}