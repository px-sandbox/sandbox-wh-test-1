/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Jira, Other } from "abstraction";
import { logger } from "core";
import { Config } from "sst/node/config";
import esb from "elastic-builder";
import { APIGatewayProxyEvent } from "aws-lambda";
import { SQSClient } from "@pulse/event-handler";
import { Queue } from "sst/node/queue";
import { mappingPrefixes } from "src/constant/config";
import { searchedDataFormator } from "../util/response-formatter";
import { getOrganizationById } from "../repository/organization/get-organization";

const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

export const handler = async function getIssuesList(event: APIGatewayProxyEvent): Promise<Other.Type.HitBody> {
    let libFormatData;

    try {
        const libData = [];
        const size = 100;
        let from = 0;

        const jiraOrgId = `${mappingPrefixes.organization}_${event?.queryStringParameters?.orgId}`;

        do {
            const query = esb
                .requestBodySearch().size(size)
                .query(
                    esb
                        .boolQuery()
                        .must([
                            esb.termQuery('body.issueType', Jira.Enums.IssuesTypes.BUG),
                            esb.termQuery('body.organizationId.keyword', jiraOrgId),
                        ])
                )
                .from(from)
                .toJSON() as { query: object };

            const esLibData = await esClientObj.paginateSearch(
                Jira.Enums.IndexName.Issue,
                query
            );



            libFormatData = await searchedDataFormator(esLibData);
            libData.push(...libFormatData)
            from += size;
        } while (libFormatData.length === size);

        const orgData = await getOrganizationById(jiraOrgId);

        await Promise.all(libData.map(bug => {
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
            return new SQSClient().sendMessage(formattedBug, Queue.qReOpenRateMigrator.queueUrl);
        }))

    } catch (error) {
        logger.error('get existing bug for reopen error', { error });
        throw error;
    }
}