import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Github } from "abstraction";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HttpStatusCode, logger, responseParser } from "core";
import { repoSastScansFomatter, storeScanReportToES } from "src/processors/repo-sast-scans";


async function deletePrevDependencies(repoId: string): Promise<void> {
    const esClientObj = new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`).toJSON();
    const script = esb.script('inline', 'ctx._source.body.isDeleted = true');

    await esClientObj.updateByQuery(
        Github.Enums.IndexName.GitRepoLibrary,
        matchQry,
        script.toJSON()
    );
}
export const handler = async function repoSastScans(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    try {
        const data: Github.ExternalType.Api.RepoSastScans = JSON.parse(event.body ?? '{}');

        const scansData = await repoSastScansFomatter(data);
        if (scansData.length > 0) {
            await storeScanReportToES(scansData);
        }
        logger.info('repoSastScans.handler.received', { scansData });
        return responseParser
            .setBody({})
            .setMessage('Repo sast scans data received successfully')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (err) {
        logger.error('repoSastScans.handler.error', { err });
        throw err;
    }
}