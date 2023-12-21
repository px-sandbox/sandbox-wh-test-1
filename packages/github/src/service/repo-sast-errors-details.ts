import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { getRepoSastErrors } from '../matrics/get-sast-errors-details';

const repoSastErrors = async function repoSastErrors(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const afterKey: string = event.queryStringParameters?.afterKey ?? '';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
    const branch: string[] = event.queryStringParameters?.branch?.split(',') ?? [];
    // TODO: orgName is not used in the functions
    // const orgName: string = event.queryStringParameters?.orgName ?? '';
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';

    try {

        const objString = Buffer.from(afterKey, 'base64').toString('utf-8') ?? '';
        const decodedAfterKey = objString.length ? JSON.parse(objString) : {};
        const sastErrorsDetails = await getRepoSastErrors(
            repoIds,
            // orgName,
            startDate,
            endDate,
            branch,
            decodedAfterKey,
        );

        return responseParser
            .setBody(sastErrorsDetails)
            .setMessage('sast error data for repo')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error(e);
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = APIHandler(repoSastErrors);
export { handler, repoSastErrors };
