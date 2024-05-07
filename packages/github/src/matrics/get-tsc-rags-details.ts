import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { weeklyHeadlineStat } from './get-product-security';

const esClientObj = ElasticSearchClient.getInstance();
const getBranches = async (repoIds: string[]): Promise<any[]> => {
  const getBranchesQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.protected', true)])
    )
    .toJSON();

  const getBrancheData = await esClientObj.search(
    Github.Enums.IndexName.GitBranch,
    getBranchesQuery
  );
  const branchesName = await searchedDataFormator(getBrancheData);
  return branchesName;
};
export async function getTscRagsDetails(repoIds: string[]): Promise<{ product_security: number }> {
  const branchesList = ['prod', 'master', 'main', 'uat', 'stage', 'qa', 'dev', 'develop'];
  const branchesName = await getBranches(repoIds);
  const branches = branchesName.reduce(
    (acc: { [x: string]: string[] }, branch: { repoId: string; name: string }) => {
      if (!acc[branch.repoId]) {
        acc[branch.repoId] = [branch.name];
      } else {
        acc[branch.repoId].push(branch.name);
      }
      return acc;
    },
    {}
  );

  Object.keys(branches).forEach((repoId) => {
    branches[repoId] = branchesList.find((name) => branches[repoId].includes(name));
  });

  const result = Object.keys(branches).map((repoId) => ({ repoId, branch: branches[repoId] }));
  const data = await weeklyHeadlineStat(result);

  return { product_security: data };
}
