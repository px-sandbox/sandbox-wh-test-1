import esb from 'elastic-builder';
import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';
import { updateIssueStatusSchema } from '../validations';
import { saveIssueStatusDetails } from '../../repository/issue/save-issue-status';

/**
 * Updates the status of a Jira issue for a given organization.
 * @param event - The APIGatewayProxyEvent containing the query string parameters.
 * @returns A Promise that resolves to an APIGatewayProxyResult.
 * @throws An error if the issue status cannot be updated.
 */
const issueStatus = async function updateIssueStatus(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const { orgId, issueStatusId, pxStatus } = event.queryStringParameters as {
        orgId: string,
        issueStatusId: string,
        pxStatus: string
    };
    logger.info({ level: 'info', message: 'jira orgId', data: { orgId, issueStatusId, pxStatus } });

    // To update issue status for an organization we first get that issue and then update its status

    try {
        const esClient = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const query = esb
            .boolQuery()
            .must([
                esb.termsQuery('body.id', issueStatusId),
                esb.termQuery('body.organizationId', orgId),
            ])
            .toJSON();

        // fetching data from elastic search based on query
        const data = await esClient.searchWithEsb(Jira.Enums.IndexName.IssueStatus, query);

        // formatting above query response data
        const [issueStatusResponse] = await searchedDataFormator(data);


        let body = null;
        const { '200': ok, '404': notFound } = HttpStatusCode;
        let statusCode = notFound;
        if (issueStatusResponse) {
            const { _id: id, ...restKeys } = issueStatusResponse;
            restKeys.pxStatus = pxStatus;
            await saveIssueStatusDetails({
                id,
                body: {
                    ...restKeys,
                }
            } as Jira.Type.IssueStatus);
            statusCode = ok;
            body = { organizationId: orgId, issueStatusId, pxStatus };
        }

        return responseParser
            .setBody(body)
            .setMessage('Successfully updated issue status')
            .setStatusCode(statusCode)
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (error) {
        logger.error('UPDATE_JIRA_ISSUE_STATUS', { error });
        throw new Error(`Not able to update issue status: ${error}`);
    }
};

const handler = APIHandler(issueStatus, {
    eventSchema: transpileSchema(updateIssueStatusSchema),
});

export { issueStatus, handler };
