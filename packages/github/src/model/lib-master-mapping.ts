import { PutCommandInput, QueryCommandInput, ScanCommandInput } from '@aws-sdk/lib-dynamodb';

import { Table } from 'sst/node/table';
// import { logger } from 'core';

export class LibParamsMapping {
    private tableName = Table.libMaster.tableName;
    // private dynamoDb = new DynamoDbDocClient();

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

    public prepareScanParams(): ScanCommandInput {
        return {
            TableName: this.tableName,
        };
    }

}
