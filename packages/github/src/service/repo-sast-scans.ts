import { Github } from "abstraction";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";
import { HttpStatusCode, logger, responseParser } from "core";
import moment from "moment";
import { repoSastScansFomatter, storeScanReportToES } from "src/processors/repo-sast-scans";

export const handler = async function repoSastScans(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {

    try {
        const data: Github.ExternalType.Api.RepoSastScans = JSON.parse(event.body ?? '{}');
        const scansData = await repoSastScansFomatter(data);
        // const s3 = new S3();
        // const params = {
        //     Bucket: 'charchit_bucket',
        //     Key: `${data.repoId}/${data.branch}/${moment().toISOString()}/sast-scan.json`,
        //     Body: JSON.stringify(scansData),
        //     ContentType: 'application/json',
        // };
        // await s3.upload(params).promise();
        if (scansData.length > 0) {
            await storeScanReportToES(scansData, data.repoId, data.branch);
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