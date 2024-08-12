import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { mappingPrefixes } from 'src/constant/config';
const esClientObj = ElasticSearchClient.getInstance();

export async function deleteInstallation(
  data: Github.ExternalType.Webhook.Installation,
  requestId: string
): Promise<void> {
  try {
    const orgId = `${mappingPrefixes.organization}_${data.installation.account.id}`;
    const matchQry = esb
      .requestBodySearch()
      .query(esb.boolQuery().must([esb.termQuery('body.id', orgId)]))
      .toJSON();

    const script = esb
      .script(
        'inline',
        `ctx._source.body.isDeleted = true; ctx._source.body.deletedAt = params.deletedAt`
      )
      .params({ deletedAt: new Date().toISOString() });
    logger.info({
      message: 'delete.installation:',
      data: JSON.stringify(matchQry),
      requestId,
    });
    await esClientObj.updateByQuery(
      Github.Enums.IndexName.GitOrganization,
      matchQry,
      script.toJSON()
    );
  } catch (error: unknown) {
    logger.error({ message: 'delete.installation.error', error: `${error}`, requestId });
    throw error;
  }
}
