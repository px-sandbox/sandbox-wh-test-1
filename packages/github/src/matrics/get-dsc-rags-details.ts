import { MetricCategories } from 'abstraction/github/type';
import { getMetricAvg, metrics } from '../util/metric-averages';

export async function getDscRagsDetails(
    startDate: string,
    endDate: string,
    repoIds: string[],
    metricCategories: MetricCategories
): Promise<{ [key: string]: number }> {
    const data = await Promise.all(
        metricCategories.map(
            async (category: string) =>
                getMetricAvg(category, metrics[category], startDate, endDate, repoIds)
        )
    );

    const result = data.reduce((obj: { [key: string]: number }, item) => ({ ...obj, [item.key]: item.value }), {});

    return result;
}
