import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { S3 } from 'aws-sdk';
import { GetObjectRequest } from 'aws-sdk/clients/s3';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';

export async function repoSastErrorsFomatter(
    data: Github.ExternalType.Api.RepoSastErrors
): Promise<Github.Type.RepoSastErrors[]> {
    return data.errors.map((error) => ({
        _id: uuid(),
        body: {
            errorMsg: error.message,
            ruleId: error.ruleId,
            repoId: `${mappingPrefixes.repo}_${data.repoId}`,
            organizationId: `${mappingPrefixes.organization}_${data.orgId}`,
            branch: data.branch,
            fileName: error.location,
            lineNumber: error.lineNo,
            codeSnippet: error.snippet,
            date: data.date,
            createdAt: data.createdAt,
            isDeleted: false,
        },
    }));
}

export async function storeSastErrorReportToES(
    data: Github.Type.RepoSastErrors[],
    repoId: string,
    branch: string,
    orgId: string
): Promise<void> {
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
            esb.termQuery(
                'body.organizationId',
                `${mappingPrefixes.organization}_${orgId}`
            ),
            esb.rangeQuery('body.createdAt').gt(moment().utc().startOf('day').toISOString())
                .lt(moment().utc().toISOString()),
            esb.termQuery('body.isDeleted', false),
        ])
        .toJSON();
    const searchedData = await esClientObj.searchWithEsb(
        Github.Enums.IndexName.GitRepoScans,
        matchQry
    );
    const formattedData = await searchedDataFormator(searchedData);
    if (formattedData.length > 0) {
        await esClientObj.bulkUpdate(Github.Enums.IndexName.GitRepoScans, formattedData);
        logger.info('repoSastErrors_deleted', { records: formattedData.length });
    }
    await esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoScans, data);
    logger.info('storeSastErrorReportToES.success');
}
export async function fetchDataFromS3(key: string): Promise<Github.ExternalType.Api.RepoSastErrors> {
    const params: GetObjectRequest = {
        Bucket: `${process.env.SST_STAGE}-sast-errors`,
        Key: key,
        ResponseContentType: 'application/json',
    };
    const s3 = new S3();
    try {
        const data = await s3.getObject(params).promise();
        const jsonData = JSON.parse(data.Body?.toString() || '{}');
        return jsonData;
    } catch (error) {
        logger.error('fetchDataFromS3.error', { error });
        throw error;
    }
}
