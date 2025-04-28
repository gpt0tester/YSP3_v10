#!/usr/bin/env bash
# Remove set -e to allow the script to continue on errors
# We'll handle errors manually for each section

########################################
# 1) START DOCKER COMPOSE SERVICES
########################################
echo "Starting docker-compose services..."
if ! docker-compose up -d; then
  echo "Warning: docker-compose encountered an issue but continuing..." >&2
fi

########################################
# 2) WAIT FOR MONGO & SET UP REPLICA SET
########################################
echo "Waiting 15 seconds for Mongo containers to initialize..."
sleep 15
# Check that mongo1 container is actually running
if ! docker ps --format '{{.Names}}' | grep -q '^mongo1$'; then
  echo "Warning: 'mongo1' container not found or not running. Skipping MongoDB replica setup." >&2
else
  # Get host IP (the first from `hostname -I`)
  HOST_IP=$(hostname -I | awk '{print $1}')
  echo "Detected Host IP: $HOST_IP"
  echo "Initiating replica set on $HOST_IP:27017..."
  
  if ! docker exec mongo1 mongosh -u admin -p 123456789 --authenticationDatabase admin --eval "
  rs.initiate({
    _id: 'rs0',
    members: [
      { _id: 0, host: '$HOST_IP:27017' }
    ]
  });
  "; then
    echo "Warning: Failed to initiate replica set, but continuing..." >&2
  else
    echo "Sleeping 5s to let the primary finalize..."
    sleep 5
    echo "Adding secondaries on $HOST_IP:27018 and $HOST_IP:27019..."
    if ! docker exec mongo1 mongosh -u admin -p 123456789 --authenticationDatabase admin --eval "
    rs.add('$HOST_IP:27018');
    rs.add('$HOST_IP:27019');
    rs.status();
    "; then
      echo "Warning: Failed to add secondary nodes to replica set, but continuing..." >&2
    else
      echo "Replica set 'rs0' is set up referencing the host IP: $HOST_IP"
    fi
  fi
fi

########################################
# 3) WAIT FOR SOLR & ENABLE BASIC AUTH
########################################
echo "Waiting another 10 seconds for Solr containers to be ready..."
sleep 10
# We'll assume your main Solr container is named 'solr'.
SOLR_CONTAINER="solr"
if ! docker ps --format '{{.Names}}' | grep -q "^$SOLR_CONTAINER$"; then
  echo "Warning: '$SOLR_CONTAINER' container not found or not running. Skipping Solr setup." >&2
else
  # Optionally, do a quick check that Solr is responding on port 8983
  echo "Checking if Solr is responding..."
  if ! curl -s http://localhost:8983/solr/admin/cores &> /dev/null; then
    echo "Warning: Solr may not be fully up yet, continuing anyway..."
  fi
  
  # Now run the "solr auth enable" command inside the solr container
  echo "Enabling Basic Auth in SolrCloud..."
  if ! docker exec "$SOLR_CONTAINER" bin/solr auth enable \
    -type basicAuth \
    -blockUnknown true \
    -credentials solr:123456789 \
    -z zookeeper:2181,zookeeper2:2181,zookeeper3:2181; then
    echo "Warning: Failed to enable Solr Basic Auth, but continuing..." >&2
  else
    echo "Basic Auth configured for SolrCloud. Username: 'solr', Password: '123456789'"
  fi
fi

########################################
# 4) DONE
########################################
echo "Setup process completed. Check warnings above for any steps that may require manual intervention."