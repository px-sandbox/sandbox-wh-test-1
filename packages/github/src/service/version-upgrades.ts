import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Github } from 'abstraction';
import { getVersionUpgrades } from '../matrics/get-version-upgrades';


const versionUpgrades = async function versionUpgrades(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    let search: string | undefined = event.queryStringParameters?.search;
    const page: string = event.queryStringParameters?.page ?? '1';
    const limit: string = event.queryStringParameters?.limit ?? '10';
    const sortKey: Github.Enums.SortKey = event.queryStringParameters?.sortKey as Github.Enums.SortKey ??
        Github.Enums.SortKey.DATEDIFF;
    const sortOrder: Github.Enums.SortOrder = event.queryStringParameters?.sortOrder as Github.Enums.SortOrder ??
        Github.Enums.SortOrder.DESC;
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
    const requestId = event.requestContext.requestId;

    try {
        const sort = {
            key: sortKey,
            order: sortOrder,
        }

        // we will throw error if search query is less than 3 characters to ensure FE doesn't send invalid data
        if (!search) {
            search = '';
        }

        const verUpgrades = await getVersionUpgrades(search, parseInt(page, 10), parseInt(limit, 10), repoIds, requestId, sort);

        return responseParser
            .setBody(verUpgrades)
            .setMessage('version upgrades data')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error({ message: "versionUpgrades.error", error: e, requestId});
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = APIHandler(versionUpgrades);
export { handler, versionUpgrades };
