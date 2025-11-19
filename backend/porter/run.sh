#!/bin/bash

# PM2 Configuration
APP_NAME="porter"
SCRIPT_PATH="./start_server.sh"
SCRIPT_CLEAN_UP="./clean_up.sh"
NODE_ENV="production"
pm2 delete $APP_NAME 2>/dev/null
pm2 start $SCRIPT_PATH --name $APP_NAME --env $NODE_ENV
