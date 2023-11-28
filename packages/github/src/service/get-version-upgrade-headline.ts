import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { LibParamsMapping } from '../model/lib-master-mapping';
import { searchedDataFormator } from '../util/response-formatter';

/**
 *  Considering that single repo will have less than 1000 libraries
 */
const getLibFromDB = async (
    libNameAndVersion: { libName: string; version: string }[]
): Promise<{ countOutOfDateLib: number; countUpToDateLib: number }> => {
    let countOutOfDateLib = 0;
    let countUpToDateLib = 0;

    const promises = libNameAndVersion.map(async (lib) => {
        const records = await new DynamoDbDocClient().find(
            new LibParamsMapping().prepareGetParams(lib.libName)
        );
        if (records && records.version) {
            const latestVer = records.version as string;
            if (latestVer !== lib.version) {
                countOutOfDateLib += 1;
            } else {
                countUpToDateLib += 1;
            }
        }
    });
    await Promise.all(promises);
    return { countOutOfDateLib, countUpToDateLib };
};

const getLibFromES = async (
    repoIds: string[]
): Promise<{
    countOutOfDateLib: number;
    countUpToDateLib: number;
}> => {
    try {
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const query = esb
            .requestBodySearch().size(repoIds.length)
            .query(
                esb
                    .boolQuery()
                    .must([esb.termsQuery('body.repoId', repoIds),
                    esb.termQuery('body.isDeleted', false)])
            )

            .toJSON() as { query: object };
        const libData = await esClientObj.searchWithEsb(
            Github.Enums.IndexName.GitRepoLibrary,
            query.query
        );
        const data = await searchedDataFormator(libData);
        const libNameAndVersion = data.map((lib: { libName: string; version: string }) => ({
            libName: lib.libName,
            version: lib.version,
        }));
        logger.info('LIB_NAME_AND_VERSION', libNameAndVersion);
        return getLibFromDB(libNameAndVersion);
    } catch (error) {
        logger.error('getLibFromES.error', error);
        throw error;
    }
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];
    const lib = await getLibFromES(repoIds);
    return responseParser
        .setBody({ headline: lib })
        .setMessage('Headline for version upgrade')
        .setStatusCode(HttpStatusCode['200'])
        .setResponseBodyCode('SUCCESS')
        .send();
}
