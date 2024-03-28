import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

/**
 * Retrieves the repository names and organization name based on the provided parameters.
 * @param repoIds - An array of repository IDs.
 * @param orgId - The ID of the organization.
 * @param prRespLen - The length of the PR response.
 * @returns A promise that resolves to an object containing the repository names and organization name.
 */
async function getRepoNamesAndOrg(
  repoIds: string[],
  orgId: string
): Promise<{ repoNames: Github.Type.RepoNamesResponse[]; orgname: string }> {
  // esb query to fetch repo name from ES
  const repoNameQuery = esb
    .requestBodySearch()
    .source(['body.id', 'body.name'])
    .size(repoIds.length)
    .query(esb.boolQuery().must(esb.termsQuery('body.id', repoIds)));
  const orgNameQuery = esb
    .requestBodySearch()
    .source(['body.name'])
    .query(esb.boolQuery().must(esb.termQuery('body.id', orgId)));

  // Fetching reponame and orgname from ES
  const [unformattedRepoNames, unformattedOrgName] = await Promise.all([
    esClientObj.search(Github.Enums.IndexName.GitRepo, repoNameQuery),
    esClientObj.search(
      Github.Enums.IndexName.GitOrganization,
      orgNameQuery
    ),
  ]);

  // formatting the reponames and orgname data coming from elastic search
  const [repoNames, orgnames] = await Promise.all([
    searchedDataFormator(unformattedRepoNames),
    searchedDataFormator(unformattedOrgName),
  ]);

  return {
    repoNames,
    orgname: orgnames[0]?.name ?? '',
  };
}

/**
 * Retrieves detailed metrics for pull request comments.
 *
 * @param startDate The start date for filtering the pull request comments.
 * @param endDate The end date for filtering the pull request comments.
 * @param repoIds An array of repository IDs to filter the pull request comments.
 * @param page The page number for pagination.
 * @param limit The maximum number of results per page.
 * @param sortKey The key to sort the results by.
 * @param sortOrder The order in which to sort the results (asc or desc).
 * @returns A Promise that resolves to an object containing the total number of pages,
 * the current page number, and the formatted pull request comment details.
 * @throws If there is an error retrieving the pull request comment details.
 */
export async function prCommentsDetailMetrics(
  startDate: string,
  endDate: string,
  repoIds: string[],
  page: number,
  limit: number,
  sortKey: string,
  sortOrder: string,
  orgId: string
): Promise<Github.Type.PRCommentsDetail> {
  logger.info('Get PR Comment Detail');
  try {
    // esb query to fetch pull request data
    const query = esb
      .requestBodySearch()
      .source(['body.title', 'body.pullNumber', 'body.reviewComments', 'body.repoId'])
      .from((page - 1) * limit)
      .size(limit)
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.repoId', repoIds),
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          ])
      )
      .sort(esb.sort(`body.${sortKey}`, sortOrder));

    // Fetching data from ES and formatting it
    const unformattedData: Other.Type.HitBody = await esClientObj.search(
      Github.Enums.IndexName.GitPull,
      query,
    );
    const response = await searchedDataFormator(unformattedData);

    logger.info(`PR-Comment-Detail-Pull-Requests: ${JSON.stringify(response)}`);

    // Calling a function to get repoNames and orgname
    const { repoNames, orgname } = await getRepoNamesAndOrg(repoIds, orgId);

    logger.info(`PR-Comment-Detail-Repo-Names: ${JSON.stringify(repoNames)}`);

    // repo object with repoId as key and repoName as value for easy access when formatting final response
    const repoObj: Record<string, string> = {};
    repoNames?.forEach((repo: Github.Type.RepoNamesResponse) => {
      repoObj[`${repo.id}`] = repo?.name ?? '';
    });

    // formatting finalResponse keys and values
    const finalResponse = response?.map((ele: Github.Type.CommentsDetailResponse) => ({
      pullNumber: ele?.pullNumber ?? 0,
      prName: ele?.title ?? '',
      reviewComments: ele?.reviewComments ?? 0,
      repoName: repoObj[ele?.repoId] ?? '',
      prLink: `https://github.com/${orgname}/${repoObj[ele?.repoId]}/pull/${ele?.pullNumber}`,
    }));

    return {
      totalPages: Math.ceil(unformattedData.hits.total.value / limit),
      page,
      data: finalResponse,
    };
  } catch (e) {
    logger.error(`Get PR Comment Detail.Error: ${e}`);
    throw new Error(`Get PR Comment Detail.Error: ${e}`);
  }
}
