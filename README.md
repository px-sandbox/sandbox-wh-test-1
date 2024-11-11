# Pulse data integration

Data integration layer for pulse

**Check by command if token is expired**

```
aws sts get-caller-identity
```

**Note:** If token expired then again need to be export the credentials on the terminal.

## Implement JWT Authorization with Auth0

- Create an account on Auth0 and create a single page application.
- On created application's settings you will get domain and client id.
- Create .env.local file and set the below keys with your values.

```
AUTH0_DOMAIN=https://your-domain
AUTH0_CLIENT_ID=client-id
```

## Configure envirnoment variables

- Make sure that sst is installed globally on your system.

        `npm i -g sst`

Explore the `setup.bash` file in the editor and update the values for each variables in
`inputs`

For Example

```
inputs=(
  'ELASTIC_NODE | "http://localhost:9200"'
)
```

After you have updated all the values accordingly, run

    `bash setup.bash`

## Configure DynamoDB for local

1. create json file in table directoy.
2. paste the following table schema in the file.

```
{
    "TableName": "<TABLE_NAME>",
    "KeySchema": [{ "AttributeName": "parentId", "KeyType": "HASH"}],
    "AttributeDefinitions": [{ "AttributeName": "parentId", "AttributeType": "S" }],
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 1,
      "WriteCapacityUnits": 1
    }
  }
```

3. Run the follwing command on terminal to create the table.
   `aws dynamodb create-table --cli-input-json file://tables/dynamodb/user.json --endpoint-url http://localhost:8000`

4. To get the data from table run following command on terminal
   `aws dynamodb --endpoint-url http://localhost:8000 scan --table-name <TABLE_NAME>`

5. To delete the table run following command on terminal
   `aws dynamodb delete-table --table-name <TABLE_NAME> --endpoint-url http://localhost:8000`

6. To get the list tables
   `aws dynamodb list-tables  --endpoint-url http://localhost:8000`

## Steps to deploy your stack (Can be change)

1. Run `pnpm i` to install all dependencies. It will install all the dependencies
2. Now Run `npm start deploy` command on terminal. It will deploy your stack changes
3. Now after successfull run visit sst console url.

## How to create an api

- We need to define endpoint inside the object of the routes key in the specific stack file.
  For eg `routes: {"PUT /notes/{id}": ""}`
- In Api endpoint key, handler’s path needs to be define.
  For eg `routes: {"PUT /notes/{id}": "src/update.handler"}`
- By default all endpoints of api will be authorized.

If we want to remove authorisation from any endpoints then in api endpoint key, an object needs to be define.
Which contains function and authorizer key.

- In function key we have to set handler’s path which needs to be called after hitting that api endpoint.
- In authorizer key we have to set “none” value.
  For eg

```
routes: {
          "GET /notes/{id}": {
          function: "src/get.handler",
          authorizer: "none",
         }
       }
```



