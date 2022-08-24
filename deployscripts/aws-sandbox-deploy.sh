#!/bin/bash

echo "This command will deploy current branch to aws dev environment"
echo "Make sure you have committed all the changes you expect to deploy"

if [ $# -lt 1 ]; then 
  export tagName="sandbox"
else
  export tagName=$1
fi

echo  "Pushing to tag ${tagName}"

git tag -af $tagName -m "Deploying to aws sandbox environment"

git push origin tags/$tagName -f

echo "You can check the status of the deployment here https://github.com/nobapay/NobaServer/actions"
