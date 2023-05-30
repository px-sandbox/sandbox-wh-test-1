import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import {
  OPENSEARCH_NODE,
  OPENSEARCH_PASSWORD,
  OPENSEARCH_USERNAME,
  mappingPrefixes,
  region,
} from 'src/constant/config';
import { Organization } from 'src/formatters/organization';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';

export async function fetchAndSaveOrganizationDetails(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string
): Promise<{ name: string }> {
  try {
    logger.info('getOrganizationDetails.invoked');
    const responseData = await octokit(`GET /orgs/${organizationName}`);
    const orgId = `${mappingPrefixes.organization}_${responseData.data.id}`;
    const records = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(orgId)
    );
    if (responseData?.data) {
      const result = new Organization(responseData.data).validate();
      if (result) {
        const formattedData = await result.formatter(records?.parentId);
        if (records === undefined) {
          logger.info('---NEW_RECORD_FOUND---');
          await new DynamoDbDocClient(region, Config.STAGE).put(
            new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
          );
        }
        await new ElasticSearchClient({
          host: OPENSEARCH_NODE,
          username: OPENSEARCH_USERNAME ?? '',
          password: OPENSEARCH_PASSWORD ?? '',
        }).putDocument(Github.Enums.IndexName.GitOrganization, formattedData);
      }
    }
    logger.info('getOrganizationDetails.successfull', {
      response: responseData?.data,
    });
    return responseData?.data?.login;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
