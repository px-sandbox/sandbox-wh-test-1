import { PutCommandInput } from '@aws-sdk/lib-dynamodb';
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
}
