import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';
import { Version, searchedDataFormator } from '../util/response-formatter';

/**
 * Creates a search query for retrieving a version by its ID.
 * @param versionId - The ID of the version.
 * @returns The search query object.
 */
function createVersionSearchQuery(versionId: string): object {
    return esb
        .requestBodySearch()
        .query(esb.termQuery('body.id', versionId))
        .toJSON();
}
/**
 * Retrieves a sprint by its ID.
 * @param versionId - The ID of the version to retrieve.
 * @returns A Promise that resolves to the retrieved version.
 */
export async function getVersion(versionId: string): Promise<Version> {
    const esClientObj = ElasticSearchClient.getInstance();
    const query = createVersionSearchQuery(versionId);
    const body = await esClientObj.search(Jira.Enums.IndexName.Version, query);
    const [version] = (await searchedDataFormator(body)) as Version[];
    return version;
}
