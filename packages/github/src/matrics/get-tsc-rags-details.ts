import { weeklyHeadlineStat } from './get-product-security';

export async function getTscRagsDetails(
    repoIds: string[],
): Promise<{ product_security: number }> {

    // TODO: for now hardcoded prod, master, main as branch 
    const branch = ['prod', 'master', 'main'];

    const data = await weeklyHeadlineStat(repoIds, branch);

    return { product_security: data };
}
