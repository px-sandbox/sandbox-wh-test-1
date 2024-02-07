import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import
  {
    DynamoDBDocumentClient,
    PutCommand,
    PutCommandInput,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    ScanCommandOutput,
    DeleteCommandInput,
    DeleteCommand,
    BatchGetCommandInput,
    BatchGetCommand,
  } from '@aws-sdk/lib-dynamodb';
import { IDynmoDbDocClient } from '../types';

export class DynamoDbDocClient implements IDynmoDbDocClient
{
  private ddbDocClient: DynamoDBDocumentClient;

  private marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: true, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: false, // false, by default.
  };

  private unmarshallOptions = {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
  };

  private translateConfig = {
    marshallOptions: this.marshallOptions,
    unmarshalOptions: this.unmarshallOptions,
  };

  private dynamoDbLocalURL = 'http://localhost:8000';
  private region = process.env.AWS_REGION;

  constructor()
  {
    const DbdClient = new DynamoDBClient( {
      region: this.region,
      endpoint: process.env.IS_LOCAL ? this.dynamoDbLocalURL : undefined,
    } );
    this.ddbDocClient = DynamoDBDocumentClient.from( DbdClient, this.translateConfig );
  }

  public getDdbDocClient (): DynamoDBDocumentClient
  {
    return this.ddbDocClient;
  }

  public async find ( getParams: QueryCommandInput ): Promise<Record<string, unknown> | undefined>
  {
    const ddbRes = await this.getDdbDocClient().send( new QueryCommand( getParams ) );
    return ddbRes.Items ? ddbRes.Items[ 0 ] : undefined;
  }

  /**
   * Retrieves items from one or more tables in a single operation.
   * @param params - The input parameters for the batchGet operation.
   * @returns A promise that resolves with the result of the batchGet operation.
   */
  public async batchGet ( params: BatchGetCommandInput ): Promise<Record<string, Record<string, unknown>[]> | undefined>
  {
    const command = new BatchGetCommand( params );
    const ddbRes = await this.getDdbDocClient().send( command );
    return ddbRes?.Responses;
  }

  public async put ( putParams: PutCommandInput ): Promise<void>
  {
    await this.getDdbDocClient().send( new PutCommand( putParams ) );
  }

  public async scan ( scanParams: ScanCommandInput ): Promise<Array<unknown>>
  {
    const ddbRes = await this.getDdbDocClient().send( new ScanCommand( scanParams ) );

    return ddbRes?.Items?.length ? ddbRes.Items : [];
  }

  public async delete ( deleteParams: DeleteCommandInput ): Promise<void>
  {
    await this.getDdbDocClient().send( new DeleteCommand( deleteParams ) );
  }

  /**
   * Scans all items in the DynamoDB table based on the provided scan parameters.
   * 
   * @param scanParams - The scan parameters for the scan operation.
   * @returns A promise that resolves to the scan command output.
   */
  public async scanAllItems ( scanParams: ScanCommandInput ): Promise<ScanCommandOutput>
  {
    const params: ScanCommandInput = { ...scanParams }; // Create a new object

    const data = await this.getDdbDocClient().send( new ScanCommand( params ) ) as ScanCommandOutput;

    return data;
  }
}
