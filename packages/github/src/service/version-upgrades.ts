import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Github } from 'abstraction';
import { getVersionUpgrades } from '../matrics/get-version-upgrades';

const versionUpgrades = async function versionUpgrades(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let search: string | undefined = event.queryStringParameters?.search ?? '';
  const sortKey: Github.Enums.SortKey =
    (event.queryStringParameters?.sortKey as Github.Enums.SortKey) ?? Github.Enums.SortKey.DATEDIFF;
  const sortOrder: Github.Enums.SortOrder =
    (event.queryStringParameters?.sortOrder as Github.Enums.SortOrder) ??
    Github.Enums.SortOrder.DESC;
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
  const { requestId } = event.requestContext;
  const afterKey = event.queryStringParameters?.afterKey ?? '';
  try {
    const afterKeyObj =
      afterKey.length > 0
        ? JSON.parse(Buffer.from(afterKey, 'base64').toString('utf-8'))
        : undefined;

    const sort = {
      key: sortKey,
      order: sortOrder,
    };

    const verUpgrades = await getVersionUpgrades(search, repoIds, requestId, afterKeyObj, sort);

    return responseParser
      .setBody(verUpgrades)
      .setMessage('version upgrades data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ message: 'versionUpgrades.error', error: e, requestId });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(versionUpgrades);
export { handler, versionUpgrades };
