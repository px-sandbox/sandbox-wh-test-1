import { Github } from 'abstraction';
import { VersionUpgradeSortType } from 'abstraction/github/type';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { getRepoSastErrors } from '../matrics/get-sast-errors-details';

const repoSastErrors = async function repoSastErrors(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const page: string = event.queryStringParameters?.page ?? '';
    const limit: string = event.queryStringParameters?.limit ?? '10';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
    const branch: string[] = event.queryStringParameters?.branch?.split(',') ?? [];
    // TODO: orgName is not used in the functions
    // const orgName: string = event.queryStringParameters?.orgName ?? '';
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    const sortKey: Github.Enums.SortKey = event.queryStringParameters?.sortKey as Github.Enums.SortKey ??
        Github.Enums.SortKey.ERRORFIRSTOCCURRED;
    const sortOrder: Github.Enums.SortOrder = event.queryStringParameters?.sortOrder as Github.Enums.SortOrder ??
        Github.Enums.SortOrder.DESC;

    try {
        const sort = {
            key: sortKey as Github.Enums.SortKey,
            order: sortOrder as Github.Enums.SortOrder,
        }
        const sastErrorsDetails = await getRepoSastErrors(
            repoIds,
            // orgName,
            startDate,
            endDate,
            branch,
            parseInt(page, 10),
            parseInt(limit, 10),
            sort as VersionUpgradeSortType | undefined
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
