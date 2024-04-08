import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios, { AxiosResponse } from 'axios';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { ParamsMapping } from '../model/params-mapping';
import { JiraCredsMapping } from '../model/prepare-creds-params';
import { mappingPrefixes } from '../constant/config';
import { esResponseDataFormator } from '../util/es-response-formatter';

const esClient = ElasticSearchClient.getInstance();
const ddbClient = DynamoDbDocClient.getInstance();

export async function getTokensByCode(code: string): Promise<Jira.ExternalType.Api.Credentials> {
  try {
    const response: AxiosResponse<Jira.ExternalType.Api.Credentials> = await axios.post(
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: Config.JIRA_CLIENT_ID,
        client_secret: Config.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: Config.JIRA_REDIRECT_URI,
      }
    );
    return response.data;
  } catch (e) {
    logger.error(`Error while getting tokens by code: ${e}`);
    throw new Error(`Error while getting tokens by code: ${e}`);
  }
}

export async function getAccessibleOrgs(
  accessToken: string
): Promise<Array<Jira.ExternalType.Api.Organization>> {
  try {
    const response: AxiosResponse<Array<Jira.ExternalType.Api.Organization>> = await axios.get(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );
    return response.data;
  } catch (e) {
    logger.error(`Error while getting accessible orgs: ${e}`);
    throw new Error(`Error while getting accessible orgs: ${e}`);
  }
}

// eslint-disable-next-line max-lines-per-function
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const code: string = event?.queryStringParameters?.code ?? '';
  const jiraToken = await getTokensByCode(code);

  let credId = uuid();

  const accessibleOrgs = await getAccessibleOrgs(jiraToken.access_token);

  const orgIds = accessibleOrgs.map(({ id }) => id);

  logger.info('orgIds', { orgIds });

  const getOrgsFromES = await esClient.search(
    Jira.Enums.IndexName.Organization,
    esb.termsQuery('body.orgId.keyword', orgIds).toJSON()
  );

  const orgsFromEs = await esResponseDataFormator(getOrgsFromES);

  if (orgsFromEs.length > 0) {
    credId = orgsFromEs[0].credId;
  }

  await Promise.all([
    ddbClient.put(new JiraCredsMapping().preparePutParams(credId, jiraToken)),
    ...accessibleOrgs
      .filter(
        (accOrg) =>
          !orgsFromEs.find((esOrg: { id: string; orgId: string }) => esOrg.orgId === accOrg.id)
      )
      .map(async ({ id, ...org }) => {
        const uuidOrg = uuid();
        await ddbClient.put(
          new ParamsMapping().preparePutParams(uuidOrg, `${mappingPrefixes.organization}_${id}`)
        );

        const ddbRes = await ddbClient.find(
          new ParamsMapping().prepareGetParams(`${mappingPrefixes.organization}_${id}`)
        );
        let parentId = ddbRes?.parentId as string | undefined;

        if (!parentId) {
          parentId = uuidOrg;
          await ddbClient.put(
            new ParamsMapping().preparePutParams(uuidOrg, `${mappingPrefixes.organization}_${id}`)
          );
        }
        await esClient.putDocument(Jira.Enums.IndexName.Organization, {
          id: parentId,
          body: {
            id: `${mappingPrefixes.organization}_${id}`,
            orgId: id,
            credId,
            createdAt: new Date(),
            ...org,
          },
        });
      }),
  ]);

  return responseParser
    .setBody({})
    .setMessage('Authentication Successfull')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
