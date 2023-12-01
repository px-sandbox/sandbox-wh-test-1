import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Github } from "abstraction";
import { logger } from "core";
import esb from "elastic-builder";
import moment from "moment";
import { Config } from "sst/node/config";
import { v4 as uuid } from 'uuid';

export async function repoSastScansFomatter(data: Github.ExternalType.Api.RepoSastScans): Promise<Github.Type.RepoSastScans[]> {
    return data.errors.map((error) => {
        return {
            _id: uuid(),
            body: {
                errorMsg: error.message,
                ruleId: error.ruleId,
                repoId: data.repoId,
                organizationId: data.organizationId,
                branch: data.branch,
                fileName: error.location,
                lineNumber: error.lineNo,
                codeSnippet: error.snippet,
                date: data.date,
                createdAt: moment().toISOString(),
                isDeleted: false,
            }
        }
    });
}

export async function storeScanReportToES(data: Github.Type.RepoSastScans[]): Promise<void> {
    const esClientObj = new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    await esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoScans, data);
    logger.info('storeScanReportToES.success');
}