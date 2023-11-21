import { PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class LibParamsMapping {
    private tableName = Table.libMaster.tableName;

    public preparePutParams<T>(libName: string, version: T): PutCommandInput {
        return {
            TableName: this.tableName,
            Item: {
                libName,
                ...version,
            },
        };
    }

    public prepareGetParams(libName: string): QueryCommandInput {
        return {
            TableName: this.tableName,
            KeyConditionExpression: 'libName = :libName',
            ExpressionAttributeValues: { ':libName': libName },
        };
    }
}
