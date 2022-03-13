#!/bin/bash

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

echo "Starting NobaServer ..."

export RUN_EMAIL_CRON=false #TODO setup a better config model

export APP_DIR="/home/ubuntu/NobaServer" # this is defined in appspec.yml
export APP_NAME=NobaServer

#TODO setup NODE_ENV variable here based on deployment-group name, tag
export NODE_ENV=production
export CONFIGS_OVERRIDE_FILES="/home/ubuntu/secrets.yaml"

cd $APP_DIR

pm2 stop $APP_NAME

pm2 start node --name $APP_NAME -- ./dist/main.js 

pm2 set pm2-logrotate:max_size 100K
pm2 set pm2-logrotate:retain 2