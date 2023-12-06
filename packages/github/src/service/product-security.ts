import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { getProductSecurity } from '../matrics/get-product-security';



/**
 * Retrieves product security data based on the provided parameters.
 * 
 * @param event - The APIGatewayProxyEvent object containing the request details.
 * @returns A Promise that resolves to an APIGatewayProxyResult object representing the response.
 */
const productSecurity = async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const startDate: string = event.queryStringParameters?.startDate ?? '';
    const endDate: string = event.queryStringParameters?.endDate ?? '';
    const interval: string = event.queryStringParameters?.interval ?? '';
    const branch = event.queryStringParameters?.branch ?? '';
    const repoIds = event.queryStringParameters?.repoIds?.split(',') ?? [];


    try {

        const prodSecurityRes = await getProductSecurity(repoIds, startDate, endDate, interval, branch);

        return responseParser
            .setBody(prodSecurityRes)
            .setMessage('Product Security data')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error(e);
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = APIHandler(productSecurity);
export { handler, productSecurity };
