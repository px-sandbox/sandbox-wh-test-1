import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { mappingPrefixes } from 'src/constant/config';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';

export async function repoSastScansFomatter(
    data: Github.ExternalType.Api.RepoSastScans
): Promise<Github.Type.RepoSastScans[]> {
    return data.errors.map((error) => ({
        _id: uuid(),
        body: {
            errorMsg: error.message,
            ruleId: error.ruleId,
            repoId: `${mappingPrefixes.repo}_${data.repoId}`,
            organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
            branch: data.branch,
            fileName: error.location,
            lineNumber: error.lineNo,
            codeSnippet: error.snippet,
            date: data.date,
            createdAt: moment().toISOString(),
            isDeleted: false,
        },
    }));
}

export async function storeScanReportToES(data: Github.Type.RepoSastScans[], repoId: string, branch: string): Promise<void> {
    const esClientObj = new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb
        .boolQuery()
        .must([
            esb.termQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`),
            esb.termQuery('body.branch', branch),
            esb.termQuery('body.organizationId', `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`),
            esb.rangeQuery('body.createdAt').lt(moment().toISOString()),
            esb.termQuery('body.isDeleted', false),
        ]).toJSON();
    const searchedData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitRepoScans, matchQry);
    const formattedData = await searchedDataFormator(searchedData);
    if (formattedData.length > 0) {
        await esClientObj.bulkUpdate(Github.Enums.IndexName.GitRepoScans, formattedData);
        logger.info('scanReport_deleted', { records: formattedData.length });
    }
    await esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoScans, data);
    logger.info('storeScanReportToES.success');
}