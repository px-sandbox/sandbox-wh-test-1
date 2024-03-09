import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { RequestInterface } from '@octokit/types';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { mappingPrefixes } from '../constant/config';
import { ParamsMapping } from '../model/params-mapping';
import { Organization } from '../processors/organization';

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
    const records = await new DynamoDbDocClient().find(new ParamsMapping().prepareGetParams(orgId));
    if (responseData?.data) {
      const result = new Organization(responseData.data).validate();
      if (result) {
        const formattedData = await result.processor(records?.parentId as string);
        if (records === undefined) {
          logger.info('---NEW_RECORD_FOUND---');
          await new DynamoDbDocClient().put(
            new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
          );
        }
        new ElasticSearchClient({
          host: Config.OPENSEARCH_NODE,
          username: Config.OPENSEARCH_USERNAME ?? '',
          password: Config.OPENSEARCH_PASSWORD ?? '',
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
