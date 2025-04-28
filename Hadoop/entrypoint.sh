#!/bin/bash
set -e

# Substitute environment variables in the properties template
envsubst < /opt/nifi/nifi-current/conf/nifi.properties.template > /opt/nifi/nifi-current/conf/nifi.properties

# Start NiFi
exec /opt/nifi/nifi-current/bin/nifi.sh run
