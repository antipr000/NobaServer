#!/bin/bash

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

if [ "$DEPLOYMENT_GROUP_NAME" == "Staging" ]
then
    sudo python2 ./awslogs-agent-setup.py -r us-east-1 -c /home/ubuntu/NobaServer/cloudwatch_agents/dev_agent.conf -n
    export NODE_ENV=staging

elif [ "$DEPLOYMENT_GROUP_NAME" == "Production" ]
then
    sudo python2 ./awslogs-agent-setup.py -r us-east-1 -c /home/ubuntu/NobaServer/cloudwatch_agents/prod_agent.conf -n
    export NODE_ENV=production

else
    echo "Skipping the configuration of CloudWatch Log Agent as \"$DEPLOYMENT_GROUP_NAME\" DEPLOYMENT_GROUP is not configured."
    export NODE_ENV=development
fi

echo "Starting NobaServer ..."

export RUN_EMAIL_CRON=false #TODO setup a better config model

export APP_DIR="/home/ubuntu/NobaServer" # this is defined in appspec.yml
export APP_NAME=NobaServer

export CONFIGS_OVERRIDE_FILES="/home/ubuntu/secrets.yaml"

cd $APP_DIR

rm ~/.aws/credentials   # cleanup credetials file (if any) so that EC2 role credentials are used.
pm2 stop $APP_NAME

pm2 start node --name $APP_NAME -- ./dist/main.js 

pm2 set pm2-logrotate:max_size 100K
pm2 set pm2-logrotate:retain 2