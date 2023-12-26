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

export async function repoSastErrorsFormatter(
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
    orgId: string,
    createdAt: string
): Promise<void> {
    try {
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
                esb.termQuery('body.organizationId', `${mappingPrefixes.organization}_${orgId}`),
                esb
                    .rangeQuery('body.createdAt')
                    .gt(moment().utc().startOf('day').toISOString())
                    .lt(createdAt),
                esb.termQuery('body.isDeleted', false),
            ])
            .toJSON();
        const script = esb.script('inline', 'ctx._source.body.isDeleted = true');
        await esClientObj.updateByQuery(
            Github.Enums.IndexName.GitRepoSastErrors,
            matchQry,
            script.toJSON()
        );

        if (data.length > 0) {
            logger.info('storeSastErrorReportToES.data', { data_length: data.length });
            await esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoSastErrors, data);
            logger.info('storeSastErrorReportToES.success');
        } else {
            logger.info('storeSastErrorReportToES.no_data');
        }
    } catch (error) {
        logger.error('storeSastErrorReportToES.error', { error });
        throw error;
    }
}
export async function fetchDataFromS3<T>(key: string): Promise<T> {
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
