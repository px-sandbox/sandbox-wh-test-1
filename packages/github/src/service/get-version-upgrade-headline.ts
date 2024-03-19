/* eslint-disable no-await-in-loop */
import { DynamoDbDocClientGh } from '@pulse/dynamodb';
import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { LibParamsMapping } from '../model/lib-master-mapping';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

function compare(
  operator: string,
  value: number,
  latestReleaseDate: string,
  currReleaseDate: string
): boolean {
  const diffInDays = moment(latestReleaseDate).diff(moment(currReleaseDate), 'months');
  let flag;
  switch (operator) {
    case '<':
      flag = diffInDays < value;
      break;
    case '<=':
      flag = diffInDays <= value;
      break;
    default:
      return false;
  }
  // logger.info(`comparator ${operator} ${value} ${latestReleaseDate} ${currReleaseDate} ${flag} ${diffInDays}`)

  return flag;
}
/**
 *  Considering that single repo will have less than 1000 libraries
 */
const getLibFromDB = async (
  libNameAndVersion: { libName: string; version: string; releaseDate: string }[],
  range: string
): Promise<{ countOutOfDateLib: number; countUpToDateLib: number }> => {
  let countOutOfDateLib = 0;
  let countUpToDateLib = 0;
  try {
    const ddbClient = DynamoDbDocClientGh.getInstance();

    const [operator, value] = range.split(' ');

    const responses = await Promise.all(
      libNameAndVersion.map(async (lib) => {
        let flag = false;
        const record = await ddbClient.find(new LibParamsMapping().prepareGetParams(lib.libName));

        if (record && record.version && record.releaseDate) {
          flag = compare(
            operator,
            parseInt(value, 10),
            String(record.releaseDate),
            lib.releaseDate
          );
        }

        return { lib, flag, record };
      })
    );

    responses.forEach((res: { flag: boolean }) => {
      if (res.flag) {
        countUpToDateLib += 1;
      } else {
        countOutOfDateLib += 1;
      }
    });

    logger.info('getLibFromDB.response', { responses, countOutOfDateLib, countUpToDateLib });

    return { countOutOfDateLib, countUpToDateLib };
  } catch (err) {
    logger.error('getLibFromDB.error', err);
    throw err;
  }
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

    let counter = 0;

    do {
      counter += 1;
      libFormatData = [];
      const { query } = esb
        .requestBodySearch()
        .query(
          esb
            .boolQuery()
            .must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.isDeleted', false)])
        )
        // .sort(esb.sort('body.libName', 'desc'))
        // .from(from)
        // .size(size)
        .toJSON() as { query: object };

      logger.info('ES-Query', { query });

      // const esLibData = await esClientObj.paginateSearch(
      //     Github.Enums.IndexName.GitRepoLibrary,
      //     query
      // );
      const esLibData = await esClientObj.search(
        Github.Enums.IndexName.GitRepoLibrary,
        query,
        from,
        size,
        ['body.libName']
      );

      logger.info(`getLibFromES - ES Query result `, { esLibData });

      libFormatData = await searchedDataFormator(esLibData);

      logger.info(`getLibFromES.response ${counter}`, { libFormatData });

      libData.push(...libFormatData);
      from += size;
    } while (libFormatData.length === size);

    const libNameAndVersion = libData.map(
      (lib: { libName: string; version: string; releaseDate: string }) => ({
        libName: lib.libName,
        version: lib.version,
        releaseDate: lib.releaseDate,
      })
    );

    // logger.info('LIB_NAME_AND_VERSION', libNameAndVersion);

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
