#!/bin/bash

echo "This command will deploy latest main branch to aws sandbox environment"

if [ $# -lt 1 ]; then 
  export tagName="sandbox"
else
  export tagName=$1
fi

echo  "Pushing to tag ${tagName}"

git fetch && git tag -af $tagName origin/main -m "Deploying to aws sandbox environment"

git push origin tags/$tagName -f

echo "You can check the status of the deployment here https://github.com/nobapay/NobaServer/actions"
