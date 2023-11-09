import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';
import { updateIssueStatusSchema } from '../validations';
import { saveIssueStatusDetails } from '../../repository/issue/save-issue-status';

// eslint-disable-next-line max-lines-per-function
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

        const query = {
            bool: {
                must: [
                    { match: { 'body.id': issueStatusId } },
                    { match: { 'body.organizationId': orgId } }
                ],
            },
        };

        // fetching data from elastic search based on query
        const { body: data } = await esClient.getClient().search({
            index: Jira.Enums.IndexName.IssueStatus,
            body: {
                query
            }
        });

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
