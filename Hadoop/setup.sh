#!/usr/bin/env bash

set -e  # Exit on any error

########################################
# 1) START DOCKER COMPOSE SERVICES
########################################
echo "Starting docker-compose services..."
docker-compose up -d

########################################
# 2) WAIT FOR MONGO & SET UP REPLICA SET
########################################
echo "Waiting 15 seconds for Mongo containers to initialize..."
sleep 15

# Check that mongo1 container is actually running
if ! docker ps --format '{{.Names}}' | grep -q '^mongo1$'; then
  echo "Error: 'mongo1' container not found or not running." >&2
  exit 1
fi

# Get host IP (the first from `hostname -I`)
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Detected Host IP: $HOST_IP"

echo "Initiating replica set on $HOST_IP:27017..."
docker exec mongo1 mongosh -u admin -p 123456789 --authenticationDatabase admin --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: '$HOST_IP:27017' }
  ]
});
"

echo "Sleeping 5s to let the primary finalize..."
sleep 5

echo "Adding secondaries on $HOST_IP:27018 and $HOST_IP:27019..."
docker exec mongo1 mongosh -u admin -p 123456789 --authenticationDatabase admin --eval "
rs.add('$HOST_IP:27018');
rs.add('$HOST_IP:27019');
rs.status();
"

echo "Replica set 'rs0' is set up referencing the host IP: $HOST_IP"

########################################
# 3) WAIT FOR SOLR & ENABLE BASIC AUTH
########################################
echo "Waiting another 10 seconds for Solr containers to be ready..."
sleep 10

# We'll assume your main Solr container is named 'solr'.
# If you have multiple nodes (solr, solr2, solr3), we just need to run `auth enable`
# from one node, but referencing the entire zookeeper ensemble. Adjust as needed.
SOLR_CONTAINER="solr"
if ! docker ps --format '{{.Names}}' | grep -q "^$SOLR_CONTAINER$"; then
  echo "Error: '$SOLR_CONTAINER' container not found or not running." >&2
  exit 1
fi

# Optionally, do a quick check that Solr is responding on port 8983
echo "Checking if Solr is responding..."
if ! curl -s http://localhost:8983/solr/admin/cores &> /dev/null; then
  echo "Warning: Solr may not be fully up yet, continuing anyway..."
fi

# Now run the "solr auth enable" command inside the solr container
# We'll assume your ZK connection string is zookeeper:2181,zookeeper2:2181,zookeeper3:2181
echo "Enabling Basic Auth in SolrCloud..."
docker exec "$SOLR_CONTAINER" bin/solr auth enable \
  -type basicAuth \
  -blockUnknown true \
  -credentials solr:123456789 \
  -z zookeeper:2181,zookeeper2:2181,zookeeper3:2181

echo "Basic Auth should now be configured for SolrCloud. Username: 'solr', Password: '123456789'"

########################################
# 4) DONE
########################################
echo "All setup steps completed successfully."
