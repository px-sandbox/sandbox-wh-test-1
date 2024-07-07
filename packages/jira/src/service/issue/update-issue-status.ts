import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, logger, responseParser } from 'core';
import { updateIssueStatusSchema } from '../validations';

/**
 * Updates the status of a Jira issue for a given organization.
 * @param event - The APIGatewayProxyEvent containing the query string parameters.
 * @returns A Promise that resolves to an APIGatewayProxyResult.
 * @throws An error if the issue status cannot be updated.
 */
const esClient = ElasticSearchClient.getInstance();
const issueStatus = async function updateIssueStatus(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const { issueStatusDocId, pxStatus } = event.queryStringParameters as {
    issueStatusDocId: string;
    pxStatus: string;
  };
  logger.info({
    requestId,
    resourceId: issueStatusDocId,
    message: 'jira orgId',
    data: { pxStatus },
  });

  // To update issue status for an organization we first get that issue and then update its status

  try {
    const data = await esClient.updateDocument(Jira.Enums.IndexName.IssueStatus, issueStatusDocId, {
      body: { pxStatus },
    });

    return responseParser
      .setBody(data)
      .setMessage('Successfully updated issue status')
      .setStatusCode(200)
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({
      requestId,
      resourceId: issueStatusDocId,
      message: 'UPDATE_JIRA_ISSUE_STATUS',
      error,
    });
    throw new Error(`Not able to update issue status: ${error}`);
  }
};

const handler = APIHandler(issueStatus, {
  eventSchema: transpileSchema(updateIssueStatusSchema),
});

export { issueStatus, handler };
