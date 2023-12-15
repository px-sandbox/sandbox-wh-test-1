import { getHeadlineStat } from './get-product-security';

export async function getTscRagsDetails(
    repoIds: string[],
    branch: string
): Promise<{ product_security: number }> {

    // TODO: for now hardcoded dev as branch 
    const data = await getHeadlineStat(repoIds, branch);

    return { product_security: data };
}
