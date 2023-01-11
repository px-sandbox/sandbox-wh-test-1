# sst-api-boilerplate
Boilerplate for SST serverless APIs

## To setup SST project in local 
  - Install node 16.* and npm 8.*
  - Setup aws credentials by exporting the credentials on terminal.
** Check by command if token is expired **
```
aws sts get-caller-identity
```
** Note: ** If token expired then again need to be export the credentials on the terminal.

## Implement JWT Authorization with Auth0
  - Create an account on Auth0 and create a single page application. 
  - On created application's settings you will get domain and client id.
  - Create .env.local file and set the below keys with your values.
```
AUTH0_DOMAIN=https://your-domain
AUTH0_CLIENT_ID=client-id
```
## How to create an api 
  - We need to define endpoint inside the object of the routes key in MyStack.ts file.
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
