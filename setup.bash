#!/bin/bash

# Load the environment variables from .env file using dotenv
source .env

# Access the value of STAGE from the environment variables
stage=$STAGE

inputs=(
  'AUTH_PUBLIC_KEY | " "'
  'IGNORED_PROJECT_KEYS | " "'
  'GITHUB_APP_ID | " "'
  'GITHUB_APP_PRIVATE_KEY_PEM | " "'
  'GITHUB_BASE_URL | " "'
  'GITHUB_SG_ACCESS_TOKEN  | " "'
  'GITHUB_SG_INSTALLATION_ID | ""'
  'GITHUB_WEBHOOK_SECRET | " "'
  'GIT_ORGANIZATION_ID | " "'
  'JIRA_CLIENT_ID | " "'
  'JIRA_CLIENT_SECRET | " "'
  'JIRA_REDIRECT_URI | " "'
  'OPENSEARCH_NODE | " "'
  'OPENSEARCH_PASSWORD | " "'
  'OPENSEARCH_USERNAME | " "'
  'REQUEST_TIMEOUT | " "'
)

for ((i=0; i<${#inputs[@]}; i++))
do
    inputs_var=${inputs[i]}
    IFS='|' read -ra input_array <<< "$inputs_var"

    command="sst secrets set "
    
        full_command="$command ${input_array[0]} ${input_array[1]} --stage ${stage}"
        echo "Executing: $full_command"
        eval $full_command
        echo "----------------------------------------"
    
done
