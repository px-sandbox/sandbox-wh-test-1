import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { compareVersions } from 'compare-versions';
import { LibParamsMapping } from '../model/lib-master-mapping';
import { searchedDataFormator } from '../util/response-formatter';

/**
 * @param version2
 * @param version1
 * If the first version is less than the second version, it returns a negative number.
 * If the first version is greater than the second version, it returns a positive number.
 * If the two versions are equal, it returns 0.
 */
function compareLibVersions(version1: string, version2: string): number {
    return compareVersions(version1, version2);
}
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
            const res = compareLibVersions(records.version as string, lib.version);
            if (res > 0) {
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
            .requestBodySearch()
            .query(esb.boolQuery().must(esb.termsQuery('body.repoId', repoIds)))
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

export async function handler(event: APIGatewayProxyEvent): Promise<{
    countOutOfDateLib: number;
    countUpToDateLib: number;
}> {
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];
    const lib = await getLibFromES(repoIds);
    return lib;
}
