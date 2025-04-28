#!/bin/sh
echo "Setting API_BASE_URL to $API_BASE_URL"
sed -i "s|REACT_APP_API_BASE_URL_PLACEHOLDER|$API_BASE_URL|g" /usr/share/nginx/html/env.js
exec "$@"