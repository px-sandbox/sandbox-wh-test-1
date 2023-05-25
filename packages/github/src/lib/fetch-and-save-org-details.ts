import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { mappingPrefixes, region } from 'src/constant/config';
import { Config } from 'sst/node/config';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { organizationFormator } from '../util/organization-formatter';
import { Organization } from 'src/formatters/organization';

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
        const formattedData = result.formatter(records?.parentId);
        if (records === undefined) {
          logger.info('---NEW_RECORD_FOUND---');
          await new DynamoDbDocClient(region, Config.STAGE).put(
            new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
          );
        }
        await new ElasticSearchClient().putDocument(
          Github.Enums.IndexName.GitOrganization,
          formattedData
        );
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
