import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { VersionUpgradeSortType } from 'abstraction/github/type';
import { getVersionUpgrades } from '../matrics/get-version-upgrades';


const versionUpgrades = async function versionUpgrades(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const search: string = event.queryStringParameters?.search ?? '';
    const page: string = event.queryStringParameters?.page ?? '';
    const limit: string = event.queryStringParameters?.limit ?? '10';
    const sort: VersionUpgradeSortType | undefined =
        event.queryStringParameters?.sort as VersionUpgradeSortType | undefined;
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];

    try {
        const verUpgrades = await getVersionUpgrades(search, parseInt(page, 10), parseInt(limit, 10), repoIds, sort);

        return responseParser
            .setBody(verUpgrades)
            .setMessage('version upgrades data')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error(e);
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = APIHandler(versionUpgrades);
export { handler, versionUpgrades };
