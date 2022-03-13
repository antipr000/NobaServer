#!/bin/bash

echo "Installing required dependencies to run NobaServer deployment"

echo "home dir is $HOME"

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash

export NVM_DIR="/root/.nvm" #code deploy agent runs as root by default
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

nvm install 14.15

npm install -g pm2

pm2 install pm2-logrotate
