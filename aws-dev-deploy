#!/bin/bash

echo "This command will deploy current branch to aws dev environment"
echo "Make sure you have committed all the changes you expect to deploy"

if [ $# -lt 1 ]; then 
  export tagName="dev"
else
  export tagName=$1
fi

echo  "pushing to tag ${tagName}"

git tag -af $tagName -m "Deploying to aws dev environment"

git push origin tags/$tagName -f
