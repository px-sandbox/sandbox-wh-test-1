/* eslint-disable no-await-in-loop */
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import moment from 'moment';
import { LibParamsMapping } from '../model/lib-master-mapping';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});
const ddbClient = new DynamoDbDocClient();

function compare(operator: string, value: number, latestReleaseDate: string, currReleaseDate: string): boolean {
    const diffInDays = moment(latestReleaseDate).diff(moment(currReleaseDate), 'months');
    switch (operator) {
        case '<': return diffInDays < value;
        case '<=': return diffInDays <= value;
        default: return false;
    }
}
/**
 *  Considering that single repo will have less than 1000 libraries
 */
const getLibFromDB = async (
    libNameAndVersion: { libName: string; version: string, releaseDate: string }[],
    range: string
): Promise<{ countOutOfDateLib: number; countUpToDateLib: number }> => {
    let countOutOfDateLib = 0;
    let countUpToDateLib = 0;
    try {

        const [operator, value] = range.split(' ');
        const promises = libNameAndVersion?.map(async (lib) => {
            const records = await ddbClient.find(
                new LibParamsMapping().prepareGetParams(lib.libName)
            );
            if (records && records.version) {
                // const latestVer = records.version as string;
                if (records.releaseDate && compare(operator, parseInt(value, 10),
                    String(records.releaseDate), lib.releaseDate)) {
                    countUpToDateLib += 1;
                } else {
                    countOutOfDateLib += 1;
                }
            }
        });
        await Promise.all(promises);
    } catch (err) {
        logger.error('getLibFromDB.error', err);
        throw err;
    }
    logger.info('up-to-date and out-of-date lib count', { countOutOfDateLib, countUpToDateLib });
    return { countOutOfDateLib, countUpToDateLib };
};

const getLibFromES = async (
    repoIds: string[],
    range: string
): Promise<{
    countOutOfDateLib: number;
    countUpToDateLib: number;
}> => {
    let libFormatData;
    try {
        const libData = [];
        const size = 100;
        let from = 0;

        do {
            const query = esb
                .requestBodySearch().size(size)
                .query(
                    esb
                        .boolQuery()
                        .must([esb.termsQuery('body.repoId', repoIds),
                        esb.termQuery('body.isDeleted', false)])
                )
                .from(from)
                .toJSON() as { query: object };

            const esLibData = await esClientObj.paginateSearch(
                Github.Enums.IndexName.GitRepoLibrary,
                query
            );

            libFormatData = await searchedDataFormator(esLibData);
            libData.push(...libFormatData)
            from += size;
        } while (libFormatData.length >= size);

        const libNameAndVersion = libData.map((lib: { libName: string; version: string, releaseDate: string }) => ({
            libName: lib.libName,
            version: lib.version,
            releaseDate: lib.releaseDate
        }));

        logger.info('LIB_NAME_AND_VERSION', libNameAndVersion);

        return getLibFromDB(libNameAndVersion, range);

    } catch (error) {
        logger.error('getLibFromES.error', error);
        throw error;
    }
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];
    const range = event.queryStringParameters?.range ?? '<= 1';
    const lib = await getLibFromES(repoIds, range);
    return responseParser
        .setBody({ headline: lib })
        .setMessage('Headline for version upgrade')
        .setStatusCode(HttpStatusCode['200'])
        .setResponseBodyCode('SUCCESS')
        .send();
}
