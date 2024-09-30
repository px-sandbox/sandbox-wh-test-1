import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { HttpStatusCode, logger, responseParser } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';


const sqsClient = SQSClient.getInstance();

export const handler = async function testcoverage(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  try {
    logger.info({
      message: 'testCoverage.handler.received',
      data: { errorData: event.body },
      requestId,
    });
    const data: Github.ExternalType.Api.RepoCoverageData = JSON.parse(event.body ?? '{}');

    const s3 = new S3();
    data.createdAt = data.createdAt || moment().toISOString();
    const timestamp = data.createdAt;
    const datePart = timestamp.split('T')[0];
    const formattedDate = datePart.replace(/-/g, '_');
    console.log(formattedDate); 

    const params = {
      Bucket: `${process.env.SST_STAGE}-test-coverage-report`,

      Key:` org_${data.organisationId}/repo_${data.repoId}/${formattedDate}/test_coverage_${timestamp}.json`,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    };
    const s3Obj = await s3.upload(params).promise();
    return responseParser
      .setBody({})
      .setMessage('Test coverage data received successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (err) {
    logger.error({ message: 'testCoverage.handler.error', error: err, requestId });
    return responseParser
      .setMessage(`Failed to get test coverage: ${err}`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
};
