#!/bin/bash

echo "Running the installation for \"$DEPLOYMENT_GROUP_NAME\" DEPLOYMENT_GROUP"

echo "Installing required dependencies to run NobaServer deployment"

echo "home dir is $HOME"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm install 16
nvm alias default 16
npm install -g pm2
pm2 install pm2-logrotate

# Install & setup CloudWatch Agent
curl https://s3.amazonaws.com/aws-cloudwatch/downloads/latest/awslogs-agent-setup.py -O

sudo apt-get update
sudo apt-get install python -y

export APP_DIR="/home/ubuntu/NobaServer"

cd $APP_DIR
# required to be in the app directory for document db ssl connection
wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem
