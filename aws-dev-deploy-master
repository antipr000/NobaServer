#!/bin/bash

echo "This command will deploy latest master branch to aws dev environment"

if [ $# -lt 1 ]; then 
  export tagName="dev"
else
  export tagName=$1
fi

echo  "pushing to tag ${tagName}"

git fetch && git tag -af $tagName origin/master -m "Deploying to aws dev environment"

git push origin tags/$tagName -f
