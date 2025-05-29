import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { weeklyHeadlineStat } from './get-product-security';

interface BranchData {
  repoId: string;
  name: string;
}

interface BranchMap {
  [repoId: string]: string;
}

const esClientObj = ElasticSearchClient.getInstance();
const getBranches = async (repoIds: string[]): Promise<BranchData[]> => {
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

  // First collect all branches for each repo
  const branchCollections: { [repoId: string]: string[] } = branchesName.reduce(
    (acc: { [x: string]: string[] }, branch: BranchData) => {
      if (!acc[branch.repoId]) {
        acc[branch.repoId] = [branch.name];
      } else {
        acc[branch.repoId].push(branch.name);
      }
      return acc;
    },
    {}
  );

  // Then select a single branch for each repo
  const branches: BranchMap = {};
  Object.keys(branchCollections).forEach((repoId) => {
    const foundBranch = branchesList.find((name) => branchCollections[repoId].includes(name));
    branches[repoId] = foundBranch || branchCollections[repoId][0]; // Use first branch as fallback
  });

  const result = Object.keys(branches).map((repoId) => ({ repoId, branch: branches[repoId] }));
  const data = await weeklyHeadlineStat(result);

  return { product_security: data };
}
