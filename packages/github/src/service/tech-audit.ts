/* eslint-disable max-lines-per-function */
import { OctokitResponse, RequestInterface } from '@octokit/types';
import { logger } from 'core';
import { Github, Other } from 'abstraction';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { APIGatewayProxyEvent } from 'aws-lambda';
import yaml from 'js-yaml';
import { searchedDataFormator } from '../util/response-formatter';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';

const esClient = ElasticSearchClient.getInstance();
/**
 * Initializes the Octokit client with the necessary headers for authorization.
 * @returns A Promise that resolves to a RequestInterface object with the required headers.
 */
export async function initializeOctokit(): Promise<
  RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >
> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
  return octokitRequestWithTimeout;
}

/**
 * Executes an ESB query to retrieve information about repositories.
 * @param repoIds An array of repository IDs to query.
 * @returns A promise that resolves to an array of objects containing repository information.
 */
async function esbQuery(
  repoIds: string[]
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const reposQuery = esb
    .requestBodySearch()
    .size(50)
    .query(esb.boolQuery().must(esb.termsQuery('body.id', repoIds)))
    .source(['body.name', 'body.id', 'body.visibility'])
    .toJSON();
  return searchedDataFormator(await esClient.search(Github.Enums.IndexName.GitRepo, reposQuery));
}

/**
 * Retrieves a list of branches that match the given regular expression for a specific repository.
 * @param branchRegex - The regular expression to match against branch names.
 * @param repoId - The ID of the repository.
 * @returns A promise that resolves to an array of objects containing the ID and body of the matched branches.
 */
async function branchEsbQuery(
  branchRegex: RegExp,
  repoId: string
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const branchQuery = esb
    .requestBodySearch()
    .size(300)
    .query(esb.boolQuery().must(esb.termQuery('body.repoId', repoId)))
    .source(['body.name'])
    .toJSON();
  return searchedDataFormator(await esClient.search(Github.Enums.IndexName.GitBranch, branchQuery));
}

/**
 * Analyzes the workflows response and returns a record of workflow tools availability.
 * @param workflowsResp - The response object containing the workflows data.
 * @param repo - The repository object containing the repository details.
 * @param requestId - The unique identifier for the request.
 * @returns A record of workflow tools availability.
 */
function workflowTools(
  workflowsResp: OctokitResponse<any> | null,
  repo: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  requestId: string
): Record<string, boolean> {
  const ymlFileRegex = /^studiographene\/nodejs-ci\/\.github\/workflows\/ci\.yml@.+/;
  const jobsList = [
    'sast',
    'gitleaks',
    'licenseScan',
    'dependency_scan',
    'lint',
    'docker',
    'pr_agent',
  ];

  // variable for storing workflows tools response
  const tools: Record<string, boolean> = {};

  if (workflowsResp) {
    const decodedData = yaml.load(
      Buffer.from(workflowsResp?.data?.content, 'base64').toString('utf-8')
    );

    logger.info({
      requestId,
      message: `Tech audit for repository: ${repo.name}`,
      data: { decodedData },
    });

    const {
      jobs: {
        'call-workflow': {
          uses,
          with: { excluded_jobs: excJobs },
        },
      },
    } = decodedData;
    const excludedJobs = excJobs ? excJobs.split(',') : [];
    if (ymlFileRegex.test(uses)) {
      jobsList.forEach((job) => {
        if (excJobs && excludedJobs.includes(job)) {
          tools[job] = false;
        } else {
          tools[job] = true;
        }
      });
    }
  }

  return tools;
}

/**
 * Calls GitHub APIs to fetch workflow file and readme information for a repository.
 * @param octokit - The Octokit instance used to make API requests.
 * @param repo - The repository information.
 * @param org - The organization name.
 * @param ref - The reference (branch or commit) to fetch the files from.
 * @param filename - The name of the workflow file.
 * @param requestId - The unique identifier for the request.
 * @returns A promise that resolves to an array of OctokitResponse objects or null values.
 */
async function callGithubApis(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  repo: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  org: string,
  ref: string,
  filename: string,
  requestId: string
): Promise<(OctokitResponse<any> | null)[]> {
  const folderPath = '.github/workflows';
  return Promise.all([
    // reading workflow file
    octokit(
      `GET /repos/${org}/${repo.name}/contents/${folderPath}/${filename}.yml?ref=${ref}`
    ).catch((error: unknown) => {
      logger.error({ requestId, message: `Error while fetching workflow file: ${error}` });
      return null; // or some default value
    }),

    // readme
    octokit(
      `GET /repos/${org}/${repo.name}/readme?ref=${ref}` // make readme name dynamic
    ).catch((error: unknown) => {
      logger.error({ requestId, message: `Error while fetching readme info: ${error}` });
      return null; // or some default value
    }),
  ]);
}

/**
 * Retrieves information about branches based on the provided branch regex.
 * @param branches - An array of branch objects containing '_id' and 'name' properties.
 * @param branchRegex - A regular expression used to match branch names.
 * @returns An object containing two arrays: 'incorrectlyNamedBranches' and 'mainBranches'.
 */
function branchesInfo(
  branches: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[],
  branchRegex: RegExp
): { incorrectlyNamedBranches: string[]; mainBranches: string[] } {
  const incorrectlyNamedBranches: string[] = [];
  const mainBranches: string[] = [];

  branches.forEach((ele) => {
    if (!branchRegex.test(ele.name)) {
      incorrectlyNamedBranches.push(ele.name);
    }
    if (/^(master|dev|qa|uat)$/.test(ele.name)) {
      mainBranches.push(ele.name);
    }
  });

  return { incorrectlyNamedBranches, mainBranches };
}

/**
 * Performs a tech audit on multiple repositories.
 *
 * @param octokit - The Octokit instance for making GitHub API requests.
 * @param repoIds - An array of repository IDs to perform the tech audit on.
 * @param ref - The reference (branch or commit) to use when fetching repository data.
 * @param filename - The name of the file to search for in the repositories.
 * @param org - The organization name that the repositories belong to.
 * @param requestId - The unique identifier for the tech audit request.
 * @returns A promise that resolves to an array of tech audit results for each repository.
 */
async function techAudit(
  octokit: RequestInterface<
    object & {
      headers: {
        Authorization: string | undefined;
      };
    }
  >,
  repoIds: string[],
  ref: string,
  filename: string,
  org: string,
  requestId: string
): Promise<
  {
    repo: string;
    visibility: string;
    tools: Record<string, boolean>;
    readme: boolean;
    incorrectlyNamedBranches: string[];
    mainBranches: string[];
  }[]
> {
  const branchRegex = /^(master|dev|qa|uat)$|^(feature|fix|hotfix|release)\/[A-Z]+-\d+$/;
  try {
    // getting repo data from Elastic search
    const formattedReposResp = await esbQuery(repoIds);
    if (!formattedReposResp?.length) {
      throw new Error('No repositories found');
    }
    logger.info({
      requestId,
      message: `Tech audit for repositories: ${repoIds}`,
      data: { formattedReposResp },
    });

    // looping on repo data
    const result = await Promise.all(
      formattedReposResp.map(async (repo) => {
        logger.info({
          requestId,
          message: `Tech audit for repository: ${repo.name}`,
          data: { repo, org, ref, filename },
        });

        // fetch branches from elastic search
        const branches = await branchEsbQuery(branchRegex, repo.id);

        const [workflowsResp, readme] = await callGithubApis(
          octokit,
          repo,
          org,
          ref,
          filename,
          requestId
        );

        // workflows tools response
        const tools: Record<string, boolean> = workflowTools(workflowsResp, repo, requestId);

        logger.info({
          requestId,
          message: `Tech audit for repository: ${repo.name}`,
          data: { repo: repo?.name ?? '', repoVisibility: repo?.visibility ?? '', tools },
        });

        // get incorrectly named branches and main branches
        const { incorrectlyNamedBranches, mainBranches } = branchesInfo(branches, branchRegex);

        return {
          repo: (repo.name as string) ?? '',
          visibility: repo?.visibility ?? '',
          tools,
          readme: readme?.status === 200,
          incorrectlyNamedBranches,
          mainBranches,
        };
      })
    );
    return result;
  } catch (error) {
    logger.error({ requestId, message: `Error while fetching tech audit: ${error}` });
    throw error;
  }
}

/**
 * Handles the tech audit request.
 * @param event - The API Gateway event object.
 * @returns A promise that resolves to an array of objects containing repository information and tool records.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<
  Promise<
    {
      repo: string;
      tools: Record<string, boolean>;
    }[]
  >
> {
  const requestId = event?.requestContext?.requestId;
  const repoIds = event?.queryStringParameters?.repoIds ?? '';
  const ref = event?.queryStringParameters?.ref ?? '';
  const filename = event?.queryStringParameters?.workflowFilename ?? 'ci';
  const org = event?.queryStringParameters?.org ?? Github.Enums.OrgConst.SG;

  const repoArr = repoIds.split(',');

  if (!repoArr?.length) {
    logger.error({ requestId, message: 'No repositories given' });
    throw new Error('No repositories given');
  }
  logger.info({ requestId, message: 'Tech audit request', data: { repoArr, ref, filename, org } });
  try {
    const octokit = await initializeOctokit();
    return techAudit(octokit, repoArr, ref, filename, org, requestId);
  } catch (error: unknown) {
    logger.error({
      requestId,
      error,
    });
    throw error;
  }
}
